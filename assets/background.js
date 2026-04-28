(function () {
  const STORAGE = "https://rzsmcysgijeshiiuyqjn.supabase.co/storage/v1/object/public/lcic-gallery/photos";

  const dayPhotos = [
    "LCIC Campus/Campus_1.jpg",
    "LCIC Campus/Campus_2.jpg",
    "LCIC Campus/Campus_3.jpg",
    "LCIC Campus/Campus_4.jpg",
    "LCIC Campus/Campus_5.jpg",
    "LCIC Campus/Campus Maingate_1.jpg",
    "LCIC Campus/Campus Maingate_2.jpg",
  ];

  const nightPhotos = [
    "LCIC Campus/Campus Night View_1.jpg",
    "LCIC Campus/Campus Night View_2.jpg",
    "LCIC Campus/Campus Night View_3.jpg",
  ];

  // Philippines time (UTC+8): 18:00–06:00 is night, otherwise day.
  const phHour = parseInt(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      hour12: false,
    }),
    10
  );
  const isNight = phHour >= 18 || phHour < 6;

  const pool = isNight ? nightPhotos : dayPhotos;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const url = `${STORAGE}/${encodeURI(pick)}`;

  document.documentElement.style.setProperty("--bg-image", `url("${url}")`);
  document.documentElement.dataset.time = isNight ? "night" : "day";
})();
