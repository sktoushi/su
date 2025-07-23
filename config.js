// config.js
const UPDATE_VISITOR_API = "https://script.google.com/macros/s/AKfycbx-c7HUH9OnQBMwDAss1WpMV0uZAs8zHwGEHSn9EIQ_hTRBKVYLiPStXQTkbhfpcS7T/exec"; // 20240819_1530
const PAYOFFS_API = "https://script.google.com/macros/s/AKfycbwrWbrBcNGcqI-4wzXS3SlzKt7Dqscv9vQrC3Gv_9ZAxFLckIIuh4bpVrMY79XlDPaL/exec"; // 240819_1739
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1Xr-9rsQxbpw3oCNziKu0Lr9dwKpvJaZWFGRE9ECa-Ps/edit?usp=sharing"; // Payoffs Sheet // 240819_1819

const config = [
    {
        "username": "mdr19ganseki95cf",
        "repo": "stash",
        "startIdx": 1,
        "endIdx": 100
    },
    {
        "username": "mdr19ganseki95cf",
        "repo": "payoffs",
        "startIdx": 1,
        "endIdx": 7
    }
];

const frequencyMods = {
    "mdr19ganseki95cf-stash": {
        "77": 100,
        "88": 100
    },
    "mdr19ganseki95cf-payoffs": {
        "5": 200
    }
};
