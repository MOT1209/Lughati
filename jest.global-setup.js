// Runs once before the test workers start, so they inherit it: every test sees the device time
// zone of the app's main audience (Arabia, UTC+3, no daylight saving). A UTC/local mix-up around
// midnight (e.g. slicing toISOString() for a calendar day) then fails here instead of on a phone.
module.exports = () => {
  process.env.TZ = 'Asia/Riyadh';
};
