const appJson = require("./app.json");

module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  const experiments = {
    ...(config.experiments ?? appJson.expo.experiments ?? {})
  };

  if (baseUrl) {
    experiments.baseUrl = baseUrl;
  }

  return {
    ...appJson.expo,
    ...config,
    experiments
  };
};
