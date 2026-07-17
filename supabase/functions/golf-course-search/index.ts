type SearchCourse = {
  id: number;
  clubName: string;
  courseName: string;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

type CourseHole = {
  holeNumber: number;
  par: number | null;
  yardage: number | null;
  meters: number | null;
  handicap: number | null;
};

type CourseTee = {
  id: string;
  gender: string;
  teeName: string;
  courseRating: number | null;
  slopeRating: number | null;
  bogeyRating: number | null;
  totalYards: number | null;
  totalMeters: number | null;
  numberOfHoles: number | null;
  parTotal: number | null;
  holes: CourseHole[];
};

type CourseDetail = SearchCourse & {
  cachedCourseId: string | null;
  tees: CourseTee[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const apiBase = "https://api.golfcourseapi.com/v1";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOLFCOURSE_API_KEY");
    if (!apiKey) {
      return json({ results: [], warning: "Golf course search is not configured yet." }, 200);
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "search");

    if (action === "detail") {
      const courseId = Number(body.courseId);
      if (!Number.isFinite(courseId)) return json({ error: "A valid course ID is required." }, 400);
      const detail = await fetchCourseDetail(courseId, apiKey);
      const cached = await cacheCourse(detail);
      return json({ course: cached });
    }

    const query = String(body.query || "").trim();
    if (query.length < 2) {
      return json({ results: [], warning: "Type at least 2 characters to search courses." });
    }

    const results = await searchCourses(query, apiKey);
    return json({ results: results.slice(0, 12) });
  } catch (error) {
    return json(
      { results: [], warning: error instanceof Error ? error.message : "Golf course search failed." },
      500
    );
  }
});

async function searchCourses(query: string, apiKey: string): Promise<SearchCourse[]> {
  const url = new URL(`${apiBase}/search`);
  url.searchParams.set("search_query", query);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) throw new Error("GolfCourseAPI search failed.");

  const data = await response.json();
  const courses = Array.isArray(data.courses)
    ? data.courses
    : Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : [];

  return courses.map(normaliseSearchCourse).filter((course): course is SearchCourse => Boolean(course));
}

async function fetchCourseDetail(courseId: number, apiKey: string): Promise<CourseDetail> {
  const response = await fetch(`${apiBase}/courses/${courseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) throw new Error("GolfCourseAPI course detail failed.");

  const data = await response.json();
  const courseData = data.course || data;
  const base = normaliseSearchCourse(courseData);
  if (!base) throw new Error("Golf course detail was missing course data.");

  return {
    ...base,
    cachedCourseId: null,
    tees: normaliseTees(courseData),
  };
}

async function cacheCourse(detail: CourseDetail): Promise<CourseDetail> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return detail;

  const courseRow = {
    external_id: detail.id,
    club_name: detail.clubName,
    course_name: detail.courseName,
    address: detail.location,
    city: detail.city,
    state: detail.state,
    country: detail.country,
    raw_data: detail,
  };

  const courseResponse = await supabaseFetch(supabaseUrl, serviceRoleKey, "golf_courses?on_conflict=external_id", {
    method: "POST",
    body: JSON.stringify(courseRow),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  const courseRows = await courseResponse.json();
  const cachedCourseId = Array.isArray(courseRows) ? courseRows[0]?.id : null;
  if (!cachedCourseId) return detail;

  const cachedTees: CourseTee[] = [];
  for (const tee of detail.tees) {
    const teeRow = {
      course_id: cachedCourseId,
      gender: tee.gender,
      tee_name: tee.teeName,
      course_rating: tee.courseRating,
      slope_rating: tee.slopeRating,
      bogey_rating: tee.bogeyRating,
      total_yards: tee.totalYards,
      total_meters: tee.totalMeters,
      number_of_holes: tee.numberOfHoles,
      par_total: tee.parTotal,
      raw_data: tee,
    };

    const teeResponse = await supabaseFetch(
      supabaseUrl,
      serviceRoleKey,
      "golf_course_tees?on_conflict=course_id,gender,tee_name,number_of_holes",
      {
        method: "POST",
        body: JSON.stringify(teeRow),
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      }
    );
    const teeRows = await teeResponse.json();
    const teeId = Array.isArray(teeRows) ? teeRows[0]?.id : null;
    if (!teeId) continue;

    const holeRows = tee.holes.map((hole) => ({
      tee_id: teeId,
      hole_number: hole.holeNumber,
      par: hole.par,
      yardage: hole.yardage,
      meters: hole.meters,
      handicap: hole.handicap,
      raw_data: hole,
    }));

    if (holeRows.length) {
      await supabaseFetch(supabaseUrl, serviceRoleKey, "golf_course_holes?on_conflict=tee_id,hole_number", {
        method: "POST",
        body: JSON.stringify(holeRows),
        headers: { Prefer: "resolution=merge-duplicates" },
      });
    }

    cachedTees.push({ ...tee, id: teeId });
  }

  return { ...detail, cachedCourseId, tees: cachedTees };
}

function normaliseSearchCourse(item: any): SearchCourse | null {
  const id = toNumber(item.id ?? item.course_id ?? item.courseId);
  if (!id) return null;

  const clubName = clean(item.club_name ?? item.clubName ?? item.facility_name ?? item.name) || "Golf club";
  const courseName = clean(item.course_name ?? item.courseName ?? item.name) || clubName;
  const city = clean(item.city);
  const state = clean(item.state ?? item.region);
  const country = clean(item.country);
  const location = clean(
    item.address ??
      item.location ??
      [city, state, country].filter(Boolean).join(", ")
  );

  return {
    id,
    clubName,
    courseName,
    location,
    city,
    state,
    country,
  };
}

function normaliseTees(courseData: any): CourseTee[] {
  const tees = courseData.tees || {};
  const groups = [
    ...normaliseTeeGroup("male", tees.male),
    ...normaliseTeeGroup("female", tees.female),
    ...normaliseTeeGroup("unknown", Array.isArray(tees) ? tees : courseData.tee_boxes),
  ];

  return groups.filter((tee, index, all) => {
    const key = `${tee.gender}-${tee.teeName}-${tee.numberOfHoles}`;
    return all.findIndex((candidate) => `${candidate.gender}-${candidate.teeName}-${candidate.numberOfHoles}` === key) === index;
  });
}

function normaliseTeeGroup(gender: string, tees: any): CourseTee[] {
  if (!Array.isArray(tees)) return [];
  return tees.map((tee, index) => {
    const holes = normaliseHoles(tee.holes);
    const parTotal = holes.reduce((sum, hole) => sum + (hole.par || 0), 0) || toNumber(tee.par_total ?? tee.par);
    const totalYards =
      toNumber(tee.total_yards ?? tee.totalYards ?? tee.yards ?? tee.yardage) ||
      holes.reduce((sum, hole) => sum + (hole.yardage || 0), 0) ||
      null;
    const totalMeters =
      toNumber(tee.total_meters ?? tee.totalMeters ?? tee.meters) ||
      holes.reduce((sum, hole) => sum + (hole.meters || 0), 0) ||
      null;

    return {
      id: `api-${gender}-${clean(tee.tee_name ?? tee.teeName ?? tee.name) || index}`,
      gender,
      teeName: clean(tee.tee_name ?? tee.teeName ?? tee.name ?? tee.color) || `Tee ${index + 1}`,
      courseRating: toNumber(tee.course_rating ?? tee.courseRating),
      slopeRating: toNumber(tee.slope_rating ?? tee.slopeRating),
      bogeyRating: toNumber(tee.bogey_rating ?? tee.bogeyRating),
      totalYards,
      totalMeters,
      numberOfHoles: toNumber(tee.number_of_holes ?? tee.numberOfHoles) || holes.length || null,
      parTotal,
      holes,
    };
  });
}

function normaliseHoles(holes: any): CourseHole[] {
  if (!Array.isArray(holes)) return [];
  return holes
    .map((hole, index) => ({
      holeNumber: toNumber(hole.hole ?? hole.hole_number ?? hole.number) || index + 1,
      par: toNumber(hole.par),
      yardage: toNumber(hole.yardage ?? hole.yards),
      meters: toNumber(hole.meters),
      handicap: toNumber(hole.handicap ?? hole.stroke_index ?? hole.strokeIndex),
    }))
    .sort((a, b) => a.holeNumber - b.holeNumber);
}

async function supabaseFetch(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  init: RequestInit & { headers?: Record<string, string> }
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Cache write failed: ${response.status}`);
  return response;
}

function clean(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
