import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== "https://rtqqmmahfdwcnaydrhhc.supabase.co")
  throw new Error("Esta prueba solo se permite en desarrollo.");
const options = { auth: { persistSession: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const member = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options,
);
const data = (r) => {
  if (r.error) throw r.error;
  return r.data;
};
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
let userId, accountId, categoryId, projectId;
try {
  const owner = data(
    await admin
      .from("profiles")
      .select("id,household_id")
      .eq("role", "admin")
      .single(),
  );
  const household = owner.household_id;
  assert(
    data(
      await admin
        .from("profiles")
        .select("id")
        .eq("household_id", household)
        .eq("role", "member"),
    ).length === 0,
    "La prueba requiere espacio de miembro vacío; no modifica usuarios existentes.",
  );
  const email = `home-${randomUUID()}@example.com`,
    password = `${randomUUID()}Aa1!`;
  userId = data(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  ).user.id;
  data(
    await admin
      .from("profiles")
      .insert({
        id: userId,
        household_id: household,
        full_name: "Prueba temporal hogar",
        role: "member",
      }),
  );
  const base = { household_id: household, created_by: owner.id };
  const owned = { ...base, created_by: userId };
  accountId = data(
    await admin
      .from("accounts")
      .insert({
        ...base,
        name: "Hogar temporal",
        type: "checking",
        opening_balance: 100,
      })
      .select("id")
      .single(),
  ).id;
  categoryId = data(
    await admin
      .from("categories")
      .insert({ ...base, name: "Hogar temporal", type: "expense" })
      .select("id")
      .single(),
  ).id;
  projectId = data(
    await admin
      .from("projects")
      .insert({ ...base, name: "Hogar temporal", budget: 50 })
      .select("id")
      .single(),
  ).id;
  data(await member.auth.signInWithPassword({ email, password }));
  const permit = async (module, level) =>
    data(
      await admin
        .from("module_permissions")
        .upsert({ ...base, user_id: userId, module, level }),
    );
  const listId = data(
    await admin
      .from("shopping_lists")
      .insert({ ...owned, name: "Lista temporal" })
      .select("id")
      .single(),
  ).id;
  const items = data(
    await admin
      .from("shopping_list_items")
      .insert([
        {
          ...owned,
          list_id: listId,
          name: "Fruta",
          quantity: 1.5,
          checked: true,
        },
        {
          ...owned,
          list_id: listId,
          name: "Leche",
          quantity: 2,
          checked: true,
          real_price: 2.4,
        },
        {
          ...owned,
          list_id: listId,
          name: "Pendiente",
          quantity: 1,
          checked: false,
          estimated_price: 4,
        },
      ])
      .select("id,name"),
  );
  const fruit = items.find((i) => i.name === "Fruta").id;
  const closeArgs = {
    p_list_id: listId,
    p_account_id: accountId,
    p_category_id: categoryId,
    p_payment_method_id: null,
    p_carry_unchecked: true,
  };
  assert(
    data(await member.from("shopping_lists").select("id").eq("id", listId))
      .length === 0,
    "None permitió leer listas.",
  );
  assert(
    (
      await member
        .from("shopping_lists")
        .insert({ ...owned, name: "No permitido" })
    ).error,
    "None permitió crear listas.",
  );
  await permit("shopping_lists", "view");
  assert(
    data(
      await member
        .from("shopping_list_items")
        .select("id")
        .eq("list_id", listId),
    ).length === 3,
    "View no leyó artículos.",
  );
  assert(
    data(
      await member
        .from("shopping_list_items")
        .update({ real_price: 1.23 })
        .eq("id", fruit)
        .select("id"),
    ).length === 0,
    "View modificó artículos.",
  );
  assert(
    (await member.rpc("duplicate_shopping_list", { p_list_id: listId })).error,
    "View duplicó una lista.",
  );
  await permit("shopping_lists", "edit");
  assert(
    (await member.rpc("close_shopping_list", closeArgs)).error,
    "Lists edit cerró sin transactions edit.",
  );
  await permit("transactions", "edit");
  assert(
    (await member.rpc("close_shopping_list", closeArgs)).error,
    "Cierre aceptó un precio real faltante.",
  );
  data(
    await member
      .from("shopping_list_items")
      .update({ real_price: 1.23 })
      .eq("id", fruit),
  );
  const result = data(await member.rpc("close_shopping_list", closeArgs));
  assert(
    data(
      await admin
        .from("transactions")
        .select("amount")
        .eq("id", result.transaction_id)
        .single(),
    ).amount === 6.65,
    "El cierre no redondeó correctamente 1.23×1.5 + 2.40×2.",
  );
  assert(
    result.new_list_id &&
      data(
        await member
          .from("shopping_list_items")
          .select("name,checked,real_price")
          .eq("list_id", result.new_list_id),
      ).every(
        (i) => i.name === "Pendiente" && !i.checked && i.real_price === null,
      ),
    "Los pendientes no pasaron a otra lista.",
  );
  assert(
    (await member.rpc("close_shopping_list", closeArgs)).error,
    "El segundo cierre generó gasto duplicado.",
  );
  assert(
    (
      await member
        .from("shopping_list_items")
        .update({ quantity: 9 })
        .eq("id", fruit)
    ).error,
    "Se pudo modificar un artículo cerrado.",
  );
  const copyId = data(
    await member.rpc("duplicate_shopping_list", { p_list_id: listId }),
  );
  const copied = data(
    await member
      .from("shopping_list_items")
      .select("name,checked,real_price,estimated_price")
      .eq("list_id", copyId),
  );
  assert(
    copied.length === 3 &&
      copied.every((i) => !i.checked && i.real_price === null) &&
      copied.find((i) => i.name === "Fruta").estimated_price === 1.23,
    "La copia no reinició carrito y precios reales.",
  );
  const wishId = data(
    await admin
      .from("shopping_items")
      .insert({ ...owned, name: "Deseo temporal", estimated_price: 8 })
      .select("id")
      .single(),
  ).id;
  const buyArgs = {
    p_item_id: wishId,
    p_amount: 7,
    p_account_id: accountId,
    p_category_id: categoryId,
    p_payment_method_id: null,
    p_create_inventory: true,
  };
  assert(
    (await member.rpc("shopping_buy", buyArgs)).error,
    "Sin permiso shopping se registró compra.",
  );
  await permit("shopping", "edit");
  assert(
    (await member.rpc("shopping_buy", buyArgs)).error,
    "Se creó inventario sin permiso inventory.",
  );
  await permit("inventory", "edit");
  const bought = data(await member.rpc("shopping_buy", buyArgs));
  assert(
    bought.transaction_id && bought.inventory_item_id,
    "Compra no produjo gasto e inventario.",
  );
  assert(
    data(
      await admin
        .from("inventory_items")
        .select("purchase_price,transaction_id")
        .eq("id", bought.inventory_item_id)
        .single(),
    ).transaction_id === bought.transaction_id,
    "Inventario no quedó vinculado al gasto.",
  );
  assert(
    (await member.rpc("shopping_buy", buyArgs)).error,
    "Compra repetida creó duplicados.",
  );
  const projectTx = data(
    await member
      .from("transactions")
      .insert({
        ...owned,
        type: "expense",
        amount: 3,
        date: "2026-09-27",
        account_id: accountId,
        category_id: categoryId,
        project_id: projectId,
        description: "Proyecto temporal",
      })
      .select("id")
      .single(),
  );
  await permit("transactions", "none");
  await permit("projects", "view");
  assert(
    data(await member.from("transactions").select("id").eq("id", projectTx.id))
      .length === 0,
    "Projects view permitió leer movimientos crudos.",
  );
  const project = data(await member.rpc("project_snapshot")).find(
    (p) => p.id === projectId,
  );
  assert(
    project.spent === 3 && project.expenses.some((t) => t.id === projectTx.id),
    "Projects view no obtuvo agregado autorizado.",
  );
  await permit("projects", "none");
  await permit("dashboard", "view");
  assert(
    data(await member.rpc("project_snapshot")).length === 0,
    "Dashboard obtuvo detalle de gastos de proyectos.",
  );
  console.log(
    "Permisos, cierre con cantidades decimales, pendientes, duplicación, compra atómica y agregados de proyectos: correctos.",
  );
} finally {
  const failures = [];
  const clean = async (label, action) => {
    try {
      data(await action());
    } catch (e) {
      failures.push(`${label}: ${e.message}`);
    }
  };
  if (userId) {
    await clean("listas", () =>
      admin.from("shopping_lists").delete().eq("created_by", userId),
    );
    await clean("deseos", () =>
      admin.from("shopping_items").delete().eq("created_by", userId),
    );
    await clean("inventario", () =>
      admin.from("inventory_items").delete().eq("created_by", userId),
    );
  }
  if (accountId)
    await clean("movimientos", () =>
      admin.from("transactions").delete().eq("account_id", accountId),
    );
  if (projectId)
    await clean("proyecto", () =>
      admin.from("projects").delete().eq("id", projectId),
    );
  if (categoryId)
    await clean("categoría", () =>
      admin.from("categories").delete().eq("id", categoryId),
    );
  if (accountId)
    await clean("cuenta", () =>
      admin.from("accounts").delete().eq("id", accountId),
    );
  if (userId) await clean("usuario", () => admin.auth.admin.deleteUser(userId));
  if (failures.length)
    throw new Error(`No se completó la limpieza: ${failures.join("; ")}`);
  console.log("Datos y usuario temporales eliminados.");
}
