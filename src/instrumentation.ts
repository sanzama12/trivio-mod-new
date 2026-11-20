/** Validate production configuration before the server accepts traffic. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { serverEnvironment } = await import("./lib/server-env");
    serverEnvironment();
  }
}
