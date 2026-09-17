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
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const apiBase = "https://api.bthree.uk/golf/v1";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "search");

    if (action === "detail") {
      const courseId = Number(body.courseId);
      if (!Number.isFinite(courseId)) return json({ error: "A valid course ID is required." }, 400);
      const detail = await fetchCourseDetail(courseId);
      const cached = await cacheCourse(detail);
      return json({ course: cached });
    }

    const query = String(body.query || "").trim();
    if (query.length < 2) {
      return json({ results: [], warning: "Type at least 2 characters to search courses." });
    }

    // Try local database search first
    const localResults = await searchLocalCourses(query);
    if (localResults.length > 0) {
      return json({ results: localResults.slice(0, 12) });
    }

    // Fallback to external API
    try {
        const results = await searchCourses(query);
        return json({ results: results.slice(0, 12) });
    } catch (error) {
        return json(
            { results: [], warning: "Golf course API is currently unavailable." },
            503
        );
    }
  } catch (error) {
    return json(
      { results: [], warning: error instanceof Error ? error.message : "Golf course search failed." },
      500
    );
  }
});

async function searchLocalCourses(query: string): Promise<SearchCourse[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return [];

  try {
    const response = await supabaseFetch(supabaseUrl, serviceRoleKey, "rpc/search_golf_courses", {
      method: "POST",
      body: JSON.stringify({ search_query: query }),
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: item.id,
      clubName: item.club_name,
      courseName: item.course_name,
      location: item.address,
      city: item.city,
      state: item.state,
      country: item.country,
    }));
  } catch (e) {
    return [];
  }
}

async function searchCourses(query: string): Promise<SearchCourse[]> {
  const url = new URL(`${apiBase}/clubs`);
  url.searchParams.set("name", query);
  url.searchParams.set("limit", "5");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) throw new Error("B3 Clubs search failed.");

  const clubsData = await response.json();
  const clubs = Array.isArray(clubsData.items) ? clubsData.items : [];

  const results: SearchCourse[] = [];

  for (const club of clubs) {
    try {
      const coursesResponse = await fetch(`${apiBase}/clubs/${club.id}/courses`, {
        headers: { Accept: "application/json" },
      });
      if (!coursesResponse.ok) continue;

      const coursesData = await coursesResponse.json();
      const courses = Array.isArray(coursesData.items) ? coursesData.items : [];

      courses.forEach((course: any) => {
        results.push({
          id: course.id,
          clubName: club.name || "Golf Club",
          courseName: course.name || "Course",
          location: [club.address1, club.postcode].filter(Boolean).join(", ") || null,
          city: club.address2 || null,
          state: club.address3 || null,
          country: null,
        });
      });
    } catch (e) {
      // Squelch individual club fetch errors
    }
  }

  return results;
}

async function fetchCourseDetail(courseId: number): Promise<CourseDetail> {
  // To get the club and course name without GET /courses/{course_id},
  // we scan the clubs to find which one owns this courseId.
  const clubsResponse = await fetch(`${apiBase}/clubs?limit=100`, {
    headers: { Accept: "application/json" },
  });
  if (!clubsResponse.ok) throw new Error("B3 Clubs list failed.");

  const clubsData = await clubsResponse.json();
  const clubs = Array.isArray(clubsData.items) ? clubsData.items : [];

  let foundClub: any = null;
  let foundCourse: any = null;

  for (const club of clubs) {
    const coursesResponse = await fetch(`${apiBase}/clubs/${club.id}/courses`, {
      headers: { Accept: "application/json" },
    });
    if (!coursesResponse.ok) continue;

    const coursesData = await coursesResponse.json();
    const courses = Array.isArray(coursesData.items) ? coursesData.items : [];

    const match = courses.find((c: any) => c.id === courseId);
    if (match) {
      foundClub = club;
      foundCourse = match;
      break; // Found, stop searching
    }
  }

  if (!foundClub || !foundCourse) {
    throw new Error("Course not found in B3 database.");
  }

  // Fetch markers for this course
  const markersResponse = await fetch(`${apiBase}/courses/${courseId}/markers`, {
    headers: { Accept: "application/json" },
  });
  if (!markersResponse.ok) throw new Error("B3 Course markers failed.");

  const markersData = await markersResponse.json();
  const markers = Array.isArray(markersData.items) ? markersData.items : [];

  const tees: CourseTee[] = [];

  for (const marker of markers) {
    const holesResponse = await fetch(`${apiBase}/markers/${marker.id}/holes`, {
      headers: { Accept: "application/json" },
    });
    if (!holesResponse.ok) continue;

    const holesData = await holesResponse.json();
    const holes = Array.isArray(holesData.items) ? holesData.items : [];

    const mappedHoles: CourseHole[] = holes.map((h: any) => ({
      holeNumber: Number(h.number),
      par: h.par ? Number(h.par) : null,
      yardage: h.distance_yards ? Number(h.distance_yards) : null,
      meters: h.distance_meters ? Number(h.distance_meters) : null,
      handicap: h.stroke_index ? Number(h.stroke_index) : null,
    }));

    tees.push({
      id: `api-${marker.id}`,
      gender: "unknown",
      teeName: marker.marker || "Tee",
      courseRating: marker.course_rating ? Number(marker.course_rating) : null,
      slopeRating: marker.slope_rating ? Number(marker.slope_rating) : null,
      bogeyRating: null,
      totalYards: marker.yards_total ? Number(marker.yards_total) : null,
      totalMeters: marker.meters_total ? Number(marker.meters_total) : null,
      numberOfHoles: mappedHoles.length,
      parTotal: marker.par_total ? Number(marker.par_total) : null,
      holes: mappedHoles,
    });
  }

  return {
    id: courseId,
    clubName: foundClub.name || "Golf Club",
    courseName: foundCourse.name || "Course",
    location: [foundClub.address1, foundClub.postcode].filter(Boolean).join(", ") || null,
    city: foundClub.address2 || null,
    state: foundClub.address3 || null,
    country: null,
    cachedCourseId: null,
    tees,
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
