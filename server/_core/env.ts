export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT ?? "",
  googleApplicationCredentialsJson: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ?? "",
  bigqueryDataset: process.env.BIGQUERY_DATASET ?? "",
  gcsBucket: process.env.GCS_BUCKET ?? "maira-creative-marker",
};
