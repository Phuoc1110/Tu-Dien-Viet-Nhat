const fetch = require("node-fetch");

const ink = [
  [[10, 50, 100], [10, 50, 10], [0, 100, 200]],
  [[10, 50, 100], [50, 50, 50], [300, 400, 500]]
];

const payload = {
  app_version: 0.4,
  api_level: "537.36",
  device: "Mozilla/5.0",
  input_type: 0,
  options: "enable_pre_space",
  requests: [
    {
      writing_guide: {
        writing_area_width: 280,
        writing_area_height: 280
      },
      pre_context: "",
      max_num_results: 20,
      max_completions: 0,
      language: "ja",
      ink: ink
    }
  ]
};

fetch("https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
