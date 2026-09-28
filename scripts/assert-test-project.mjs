export function assertTestProject(url) {
  const expected = process.env.SUPABASE_TEST_URL;
  if (!expected || url !== expected)
    throw new Error(
      "Esta prueba solo se permite cuando SUPABASE_TEST_URL coincide con el proyecto de desarrollo.",
    );
}
