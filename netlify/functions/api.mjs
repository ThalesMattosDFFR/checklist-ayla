import { getStore } from "@netlify/blobs";

// API do checklist: os dados ficam no Netlify Blobs, um registro por item.
const INICIAIS = [
  ['cnpj-1','cnpj',1,'Início da operação com o CNPJ da Bela Pedra (validar com o Rosito)','Diego','Obs.: avaliar no futuro se vamos mudar de CNPJ, conforme o funcionamento'],
  ['cnpj-2','cnpj',2,'Definir a ferramenta de integração: Upseller agora ou ferramenta atual com migração depois','Diego / Gabriel','A definir'],
  ['cnpj-3','cnpj',3,'Ajustar expedição e emissão de nota fiscal nos dois lados','Diego / Gabriel','Menor ruído possível para a equipe parceira'],
  ['cnpj-4','cnpj',4,'Certificado digital solicitado à contabilidade (necessário para emitir NF)','Diego',''],
  ['cnpj-5','cnpj',5,'Contas nos marketplaces criadas e configuradas','Gabriel','Era para segunda (23/11)'],
  ['cnpj-6','cnpj',6,'Todos com acesso ao painel do TikTok e à central de afiliados','Gabriel',''],
  ['cnpj-7','cnpj',7,'Apresentar ao time as ferramentas de performance dos marketplaces','Gabriel',''],
  ['kits-1','kits',1,'Validar o arquivo com a ordem de subida dos produtos','Grupo',''],
  ['kits-2','kits',2,'Montar 10 kits com 10 peças cada + 2 peças de outlet por kit','Gabriel',''],
  ['kits-3','kits',3,'Júnior escolher as 20 peças de outlet (fins promocionais)','Júnior / Gabriel',''],
  ['kits-4','kits',4,'Conferir fotos e códigos dos produtos no Drive','Gabriel / Júnior',''],
  ['kits-5','kits',5,'Organizar a separação dos materiais','Márcio / Júnior / Diego','Márcio já avisou que vai iniciar'],
  ['fin-1','financeiro',1,'Planilha de projeção de 12 meses: custos, markup 3 em todas as peças, comissões, margem para promoções','Leandro / Luiza',''],
  ['fin-2','financeiro',2,'Sistema no-code de projetado x realizado (com relatórios diários do Gabriel)','Diego','Depois da planilha'],
  ['fin-3','financeiro',3,'Planilha de taxas dos canais de venda (20% a 25%) + dados dos produtos','Gabriel',''],
  ['fin-4','financeiro',4,'Fechar regra de parcelamento com o Rosito: coleção nova até 5x, coleção antiga/parada até 10x sem juros','Diego',''],
  ['fin-5','financeiro',5,'Definir teto de vendas e prazos de repasse ao Rosito (ainda em aberto)','Diego / Luiza','Pendente'],
  ['fin-6','financeiro',6,'Levantar parcelamento, antecipação de recebíveis e taxas das plataformas','Luiza',''],
  ['log-1','logistica',1,'Alinhar com o Júnior: antecedência, volume e limite diário de pedidos, prazos de postagem','Gabriel','Risco: picos de ~1.000 pedidos/dia'],
  ['mkt-1','marketing',1,'Prospectar 20 a 30 influenciadores para teste (filtros: acessórios, público ~80% feminino)','Gabriel / Leandro','Contatos na semana de 23/11'],
  ['mkt-2','marketing',2,'Definir comissão dos afiliados e valor de incentivo por publicação','Grupo',''],
  ['mkt-3','marketing',3,'Planejar campanhas e posicionamento (jan/fev, coleção de março, prata em junho)','Ramon',''],
  ['mkt-4','marketing',4,'Conversar com o Márcio sobre frentes de marketing e planejamento','Diego',''],
  ['mkt-5','marketing',5,'Organizar a live inaugural de 06/12 e convidar sellers','Leandro / Gabriel',''],
  ['mkt-6','marketing',6,'Definir meta de lives diárias (2 a 3 h por criador)','Gabriel',''],
  ['time-1','time',1,'Compartilhar no grupo o documento com a descrição das funções','Gabriel',''],
  ['time-2','time',2,'Demandas e decisões centralizadas em Leandro, Luía e Diego','Todos',''],
  ['time-3','time',3,'Confirmar a próxima reunião: se a devolutiva chegar hoje (23/11), reunião amanhã (24/11) às 11h; se não, na quarta (25/11), assim que recebermos','Leandro','Avisar no grupo'],
];


const TRIP = ["motorista", "telefone", "carro", "placa"];
const FIELDS = ["secao", "ordem", "texto", "resp", "prazo", "feito"];
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const clean = (b) => { const o = {}; FIELDS.forEach(k => { if (k in b) o[k] = k === "feito" ? !!b[k] : k === "ordem" ? Number(b[k]) || 0 : String(b[k]).slice(0, 2000); }); return o; };

const RENAMES = [[/D1ego/g, "Diego"], [/\bJulia\b/g, "Luiza"]];

async function fixNames(store) {
  if (await store.get("meta/fix-names-v2")) return;
  const { blobs } = await store.list({ prefix: "item/" });
  const fix = v => RENAMES.reduce((t, [re, to]) => t.replace(re, to), String(v || ""));
  await Promise.all(blobs.map(async b => {
    const it = await store.get(b.key, { type: "json" });
    if (!it) return;
    const n = { ...it, texto: fix(it.texto), resp: fix(it.resp), prazo: fix(it.prazo) };
    if (n.texto !== it.texto || n.resp !== it.resp || n.prazo !== it.prazo) await store.setJSON(b.key, n);
  }));
  await store.set("meta/fix-names-v2", "1");
}

async function seed(store) {
  if (await store.get("meta/seeded")) return fixNames(store);
  await Promise.all(INICIAIS.map(r => store.setJSON("item/" + r[0], { id: r[0], secao: r[1], ordem: r[2], texto: r[3], resp: r[4], prazo: r[5], feito: false })));
  await store.set("meta/seeded", "1");
}

export default async (req) => {
  const store = getStore({ name: "checklist-ayla", consistency: "strong" });
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  try {
    if (req.method === "GET" && parts[0] === "state") {
      await seed(store);
      const { blobs } = await store.list({ prefix: "item/" });
      const itens = (await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))).filter(Boolean);
      const aeroporto = (await store.get("aeroporto", { type: "json" })) || {};
      return json({ itens, aeroporto });
    }
    if (parts[0] === "itens") {
      if (req.method === "POST") {
        const b = clean(await req.json());
        if (!b.texto || !b.secao) return json({ error: "texto e secao são obrigatórios" }, 400);
        const id = crypto.randomUUID().slice(0, 8);
        await store.setJSON("item/" + id, { id, feito: false, resp: "", prazo: "", ordem: 0, ...b });
        return json({ id });
      }
      const id = (parts[1] || "").replace(/[^A-Za-z0-9_-]/g, "");
      if (!id) return json({ error: "id ausente" }, 400);
      if (req.method === "PATCH") {
        const cur = await store.get("item/" + id, { type: "json" });
        if (!cur) return json({ error: "item não encontrado" }, 404);
        await store.setJSON("item/" + id, { ...cur, ...clean(await req.json()), id });
        return json({ ok: true });
      }
      if (req.method === "DELETE") { await store.delete("item/" + id); return json({ ok: true }); }
    }
    if (parts[0] === "aeroporto" && req.method === "PUT") {
      const b = await req.json(); const o = {};
      TRIP.forEach(k => o[k] = String(b[k] || "").slice(0, 200));
      await store.setJSON("aeroporto", o);
      return json({ ok: true });
    }
    return json({ error: "rota não encontrada" }, 404);
  } catch (e) {
    return json({ error: "erro no servidor" }, 500);
  }
};

export const config = { path: "/api/*" };
