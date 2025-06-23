import axios from "axios";
import qs from "qs";

const sessionid = "31e9c717f1fe1de0d2b35700";
const steamLoginSecure = "76561198445539646%7C%7CeyAidHlw..."; // бүрэн cookie тавих
const partnerSteamID = "76561198848169809"; // 76561197960265728 + 1487904181
const assetid = "44154786819";
const tradeToken = "B_8Lt6Te";

const payload = {
  sessionid: sessionid,
  serverid: "1",
  partner: partnerSteamID,
  tradeoffermessage: "Hi, let's trade!",
  json_tradeoffer: JSON.stringify({
    me: {
      assets: [
        {
          appid: 730,
          contextid: "2",
          assetid: assetid,
          amount: 1,
        },
      ],
      currency: [],
      ready: false,
    },
    them: {
      assets: [],
      currency: [],
      ready: false,
    },
  }),
  captcha: "",
  trade_offer_create_params: JSON.stringify({
    trade_offer_access_token: tradeToken,
  }),
};

const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Cookie: `sessionid=${sessionid}; steamLoginSecure=${steamLoginSecure}`,
  Origin: "https://steamcommunity.com",
  Referer: `https://steamcommunity.com/tradeoffer/new/?partner=1487904181`,
};

try {
  const res = await axios.post(
    "https://steamcommunity.com/tradeoffer/new/send",
    qs.stringify(payload),
    { headers }
  );
  console.log("✅ Trade Offer Response:", res.data);
} catch (err) {
  console.error(
    "❌ Error sending trade offer:",
    err.response?.data || err.message
  );
}
