/**************************************
 * CONFIGURAÇÕES GERAIS
 **************************************/
const PLANILHA_ID = "17TcbvfKHLyUE98iQ9BPUp4Y4f05tTuhK3ePuNXqUPUs"; 
const ABA_USUARIOS = "Usuarios";
const ABA_PRODUTOS = "Produtos";
const ABA_EMAILS = "ListaEmail";

const DRIVE_CONTAGENS_FOLDER_ID = "1R-QxhLLBXfwKSep0yCFY3IV0S6BSdS44"; // Pasta final de contagens
const DRIVE_TEMP_FOLDER_ID = "1y1JhwusBPHR4jX71PS2N6dhZAyexFKCq"; // Pasta TEMPORÁRIA para JSON

/**************************************
 * LOGIN DE USUÁRIO
 **************************************/
function autenticarUsuario(codigo) {
  const sheet = SpreadsheetApp.openById(PLANILHA_ID).getSheetByName(ABA_USUARIOS);
  const dados = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dados.length; i++) {
    const codPlanilha = String(dados[i][0]).trim();
    const nomePlanilha = String(dados[i][1]).trim();
    if (codigo === codPlanilha) {
      return { sucesso: true, nome: nomePlanilha };
    }
  }
  
  return { sucesso: false };
}

/**************************************
 * LISTAR PRODUTOS (com todos os campos)
 **************************************/
function getProdutos() {
  const sheet = SpreadsheetApp.openById(PLANILHA_ID).getSheetByName(ABA_PRODUTOS);
  const dados = sheet.getDataRange().getValues();
  let lista = [];
  for (let i = 1; i < dados.length; i++) {
    lista.push({
      codigo: String(dados[i][0]).trim(),
      nome: String(dados[i][1]).trim(),
      tipo: String(dados[i][2]).trim(),
      almoxarifado: String(dados[i][3]).trim(),
      filial: String(dados[i][4]).trim(),
      contagem: String(dados[i][5]).trim()
    });
  }
  return lista;
}

/**************************************
 * CRIAR CACHE DA CONTAGEM NO DRIVE
 **************************************/
function criarCacheContagem(usuario, contagem, filial) {
  const pastaTemp = DriveApp.getFolderById(DRIVE_TEMP_FOLDER_ID);
  const cacheData = {
    usuario: usuario,
    contagem: contagem,
    filial: filial,
    itens: [],
    dataInicio: new Date()
  };

  const nomeArquivo = `contagem_temp_${contagem}.json`;

  // Remove caches antigos com mesmo nome
  const arquivosExistentes = pastaTemp.getFilesByName(nomeArquivo);
  while (arquivosExistentes.hasNext()) {
    arquivosExistentes.next().setTrashed(true);
  }

  const blob = Utilities.newBlob(JSON.stringify(cacheData), "application/json", nomeArquivo);
  pastaTemp.createFile(blob);
}

/**************************************
 * SALVAR ITEM TEMPORARIAMENTE
 **************************************/
function salvarItemContagem(dados) {
  const pastaTemp = DriveApp.getFolderById(DRIVE_TEMP_FOLDER_ID);

  // ✅ Nome do JSON sempre relacionado à contagem
  const nomeArquivo = `contagem_temp_${dados.contagem}.json`;

  let cache = null;
  const arquivos = pastaTemp.getFilesByName(nomeArquivo);

  // ✅ Se já existe JSON dessa contagem, carrega os itens atuais
  if (arquivos.hasNext()) {
    cache = JSON.parse(arquivos.next().getBlob().getDataAsString());
  } else {
    // ✅ Cria nova estrutura apenas se realmente houver item sendo salvo
    cache = {
      usuario: dados.usuario,
      contagem: dados.contagem,
      filial: dados.filial,
      almoxarifado: dados.almoxarifado || "-",
      itens: []
    };
  }

  // ✅ Adiciona o novo item ao array
  cache.itens.push({
    codigo: dados.codigo,
    nome: dados.nome,
    quantidade: dados.quantidade,
    almoxarifado: dados.almoxarifado,
    filial: dados.filial,
    contagem: dados.contagem,
    fotoBase64: dados.fotoBase64 || null,
    comentario: dados.comentario || "",
    data: new Date()
  });

  // ✅ Remove o JSON antigo para evitar duplicação
  const arquivosAntigos = pastaTemp.getFilesByName(nomeArquivo);
  while (arquivosAntigos.hasNext()) {
    arquivosAntigos.next().setTrashed(true);
  }

  // ✅ Cria/atualiza o JSON da contagem
  const blob = Utilities.newBlob(JSON.stringify(cache), "application/json", nomeArquivo);
  pastaTemp.createFile(blob);

  return { sucesso: true };
}


/**************************************
 * REMOVER ITEM DO CACHE
 **************************************/
function removerItemContagem(codigo) {
  try {
    const pastaTemp = DriveApp.getFolderById(DRIVE_TEMP_FOLDER_ID);
    const files = pastaTemp.getFilesByName("contagem_temp.json");
    if (!files.hasNext()) return false;

    const file = files.next();
    let conteudo = JSON.parse(file.getBlob().getDataAsString());
    conteudo = conteudo.filter(it => it.codigo !== codigo);
    file.setContent(JSON.stringify(conteudo));
    return true;
  } catch (e) {
    return false;
  }
}

/**************************************
 * LISTAR CONTAGENS ABERTAS
 **************************************/
function listarContagensAbertas(filialUsuario) {
  const pastaTemp = DriveApp.getFolderById(DRIVE_TEMP_FOLDER_ID);
  const files = pastaTemp.getFilesByType("application/json");
  let lista = [];

  while (files.hasNext()) {
    let file = files.next();
    let cache = JSON.parse(file.getBlob().getDataAsString());

    // Verifica se a contagem pertence à filial
    const filialCache = (cache.filial || "").trim();

    // ✅ Se o usuário é ADM, traz tudo. Se não, traz só da filial dele
    if (filialUsuario !== "ADM" && filialUsuario !== cache.filial) {
      continue;
    }

    lista.push({
      arquivo: file.getName(),
      contagem: cache.contagem || "Contagem sem nome",
      filial: cache.filial || "Não definida",
      usuario: cache.usuario || "Desconhecido",
      itens: cache.itens ? cache.itens.length : 0,
      inicio: cache.dataInicio 
        ? Utilities.formatDate(new Date(cache.dataInicio), Session.getScriptTimeZone(), "dd/MM/yyyy")
        : Utilities.formatDate(file.getDateCreated(), Session.getScriptTimeZone(), "dd/MM/yyyy")
    });
  }
  return lista;
}

/**************************************
 * CARREGAR UM CACHE ESPECÍFICO
 **************************************/
function carregarCacheEspecifico(nomeArquivo) {
  const pastaTemp = DriveApp.getFolderById(DRIVE_TEMP_FOLDER_ID);
  const files = pastaTemp.getFilesByName(nomeArquivo);

  if (!files.hasNext()) {
    return null;
  }

  const file = files.next();
  let cache = JSON.parse(file.getBlob().getDataAsString());

  if (cache.itens && cache.itens.length > 0) {
    cache.itens = cache.itens.map(it => ({
      ...it,
      contagem: it.contagem || cache.contagem || "Desconhecida",
      filial: it.filial || cache.filial || "Não definida",
      almoxarifado: it.almoxarifado || cache.almoxarifado || "-"
    }));
  }

  return cache;
}

/**************************************
 * SALVAR NA ABA baseCSV
 **************************************/
function salvarItensNaBaseCSV(itens) {
  try {
    const planilha = SpreadsheetApp.openById(PLANILHA_ID);
    const aba = planilha.getSheetByName("baseCSV");

    let linhas = itens.map(item => {
      const dataBR = Utilities.formatDate(new Date(item.data || new Date()), Session.getScriptTimeZone(), "dd/MM/yyyy");
      return [
        item.contagem || "-",
        item.codigo || "-",
        item.nome || "-",
        item.almoxarifado || "-",
        item.filial || "-",
        item.quantidade || "0",
        dataBR
      ];
    });

    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
    Logger.log("✅ Itens adicionados na baseCSV com sucesso!");
  } catch (e) {
    Logger.log("❌ Erro ao salvar na baseCSV: " + e);
  }
}

/**************************************
 * GERAR PDF
 **************************************/
function gerarPDFContagem(itens, usuario) {
  const htmlItens = itens.map(item => {
      const dataBR = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
      const fotoTag = item.fotoBase64 
        ? `<img src="data:image/jpeg;base64,${item.fotoBase64}" 
          style="max-width: 300px; max-height: 300px; width: auto; height: auto; object-fit: contain; border: 1px solid #ccc; border-radius: 8px;">`
        : `<div style="width:200px; height:150px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; color:#999;">Sem foto</div>`;
      return `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #ddd; padding:10px 0;">
          <div style="width:60%; font-size:14px;">
            <p><b>Data:</b> ${dataBR}</p>
            <p><b>Contagem:</b> ${item.contagem}</p>
            <p><b>Código:</b> ${item.codigo}</p>
            <p><b>Nome:</b> ${item.nome}</p>
            <p><b>Tipo:</b> ${item.tipo || "-"}</p>
            <p><b>Almoxarifado:</b> ${item.almoxarifado || "-"}</p>
            <p><b>Filial:</b> ${item.filial}</p>
            <p><b>Quantidade:</b> ${item.quantidade}</p>
            <p><b>Comentário:</b> ${item.comentario || "-"}</p>
          </div>
          <div style="width:35%; text-align:center;">${fotoTag}</div>
        </div>
      `;
    }).join("");

  const htmlPdf = `
    <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            hr { margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>📋 Relatório de Contagem</h1>
          <p><b>Usuário:</b> ${usuario}</p>
          <p><b>Data:</b> ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy")}</p>
          <hr>
          ${htmlItens}
          <hr>
          <p style="text-align:center; font-size:10px; color:#777;">Relatório gerado automaticamente • Lucas Vidal</p>
        </body>
      </html>
  `;
  return HtmlService.createHtmlOutput(htmlPdf).getAs("application/pdf").setName("relatorio_contagem.pdf");
}

/**************************************
 * ENVIAR E-MAIL COM PDF + CSV
 **************************************/
function enviarEmailEncerramento(usuario, itens, arquivoPDF, arquivoCSV, dataAtual, labelContagens, filiaisUnicas, almoxUnicos) {
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    const abaEmails = ss.getSheetByName(ABA_EMAILS);
    const dadosEmails = abaEmails.getDataRange().getValues();

    let destinatarios = [];
    for (let i = 1; i < dadosEmails.length; i++) {
      let email = String(dadosEmails[i][0]).trim();
      let nome = String(dadosEmails[i][1] || "").trim();
      if (email && email.includes("@")) {
        destinatarios.push({ email, nome });
      }
    }

    if (destinatarios.length === 0) {
      Logger.log("⚠️ Nenhum destinatário configurado para envio de e-mail.");
      return;
    }

    const contagemExibida = labelContagens && labelContagens !== "" ? labelContagens : "SEM_CONTAGEM";
    const assunto = `${filiaisUnicas.join(", ")} | 📦 Contagem: ${contagemExibida} | ${dataAtual}`;

    destinatarios.forEach(d => {
      const corpoEmail = `
        <p>Olá${d.nome ? ", <b>" + d.nome + "</b>" : ""},</p>
        <p>A contagem foi encerrada com sucesso.</p>

        <div style="font-size:14px; line-height:22px; margin-left:4px;">
          <div style="display:flex; align-items:center;">
            <span style="width:22px;">👤</span>
            <b>Usuário:</b>&nbsp; ${usuario}
          </div>
          <div style="display:flex; align-items:center;">
            <span style="width:22px;">📋</span>
            <b>Contagem:</b>&nbsp; ${contagemExibida}
          </div>
          <div style="display:flex; align-items:center;">
            <span style="width:22px;">📍</span>
            <b>Filial:</b>&nbsp; ${filiaisUnicas.join(", ")}
          </div>
          <div style="display:flex; align-items:center;">
            <span style="width:22px;">📅</span>
            <b>Data:</b>&nbsp; ${dataAtual}
          </div>
        </div>

        <br>
        <p>Segue em anexo o relatório <b>PDF</b> e <b>CSV</b> da contagem.</p>
        <p style="font-size:12px; color:#777;">E-mail automático – não responda.</p>
      `;

      Logger.log(`📧 Enviando e-mail para: ${d.email}`);
      MailApp.sendEmail({
        to: d.email,
        subject: assunto,
        htmlBody: corpoEmail,
        attachments: [
          arquivoPDF.getBlob(),
          arquivoCSV.getBlob()
        ]
      });
    });

    Logger.log("✅ E-mails enviados com sucesso!");
  } catch (err) {
    Logger.log("❌ Erro ao enviar e-mail: " + err.message);
  }
}

/**************************************
 * NOVA FUNÇÃO PARA REMOVER CACHES ENCERRADOS
 **************************************/
function removerCachesEncerrados(listaContagens) {
  if (!Array.isArray(listaContagens) || listaContagens.length === 0) {
    Logger.log("⚠️ Nenhuma contagem informada para remoção.");
    return;
  }

  const pastaTemp = DriveApp.getFolderById(DRIVE_TEMP_FOLDER_ID);
  const arquivos = pastaTemp.getFiles();  
  let removidos = [];

  while (arquivos.hasNext()) {
    let file = arquivos.next();
    let nome = file.getName(); // exemplo: contagem_temp_290.json

    for (let cont of listaContagens) {
      let padrao = `contagem_temp_${cont}.json`;
      if (nome === padrao) {
        file.setTrashed(true);
        removidos.push(nome);
        Logger.log(`✅ Cache removido: ${nome}`);
        break;
      }
    }
  }

  if (removidos.length === 0) {
    Logger.log("⚠️ Nenhum cache correspondente encontrado.");
  } else {
    Logger.log(`✅ Total removido: ${removidos.length} -> ${removidos.join(", ")}`);
  }
}

/**************************************
 * ENCERRAR CONTAGEM (AGORA REMOVE CACHES ESPECÍFICOS)
 **************************************/
function encerrarContagem(usuario, itensDoFront, nomeArquivoJSON) {
  try {
    const pastaTemp = DriveApp.getFolderById(DRIVE_TEMP_FOLDER_ID);
    let itens = [];

    if (itensDoFront && Array.isArray(itensDoFront) && itensDoFront.length > 0) {
      itens = itensDoFront;
    } else {
      if (!nomeArquivoJSON) return { sucesso: false, mensagem: "Nenhum arquivo JSON informado!" };

      const tempFiles = pastaTemp.getFilesByName(nomeArquivoJSON);
      if (!tempFiles.hasNext()) return { sucesso: false, mensagem: "Nenhum item salvo para encerrar!" };

      const tempFile = tempFiles.next();
      let cache = JSON.parse(tempFile.getBlob().getDataAsString());

      const contagemPrincipal = cache.contagem || "Desconhecida";
      const filialPrincipal = cache.filial || "Não definida";
      const almoxPrincipal = cache.almoxarifado || "-";

      itens = (cache.itens || []).map(it => ({
        ...it,
        contagem: it.contagem || contagemPrincipal,
        filial: it.filial || filialPrincipal,
        almoxarifado: it.almoxarifado || almoxPrincipal
      }));
    }

    if (!itens || itens.length === 0) return { sucesso: false, mensagem: "Nenhum item para encerrar!" };

    const contagensUnicas = [...new Set(itens.map(i => i.contagem))].filter(c => c && c !== "-");
    const filiaisUnicas = [...new Set(itens.map(i => i.filial || "-"))];
    const almoxUnicos   = [...new Set(itens.map(i => i.almoxarifado || "-"))];
    const labelContagens = contagensUnicas.length > 0 ? contagensUnicas.join(", ") : "Desconhecida";

    const dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");
    const pastaFinal = DriveApp.getFolderById(DRIVE_CONTAGENS_FOLDER_ID);
    const pastaContagem = pastaFinal.createFolder(`CTG_${labelContagens}_${dataAtual}`);

    const csvLinhas = [["Contagem", "Código", "Nome", "Almoxarifado", "Filial", "Quantidade", "Data"]];
    itens.forEach(item => {
      const dataBR = Utilities.formatDate(new Date(item.data || new Date()), Session.getScriptTimeZone(), "dd/MM/yyyy");
      csvLinhas.push([
        item.contagem || labelContagens,
        item.codigo,
        item.nome,
        item.almoxarifado || "-",
        item.filial || "-",
        item.quantidade,
        dataBR
      ]);
    });

    // ✅ Salva também na planilha baseCSV
    salvarItensNaBaseCSV(itens);

    // ✅ Cria CSV físico
    const csvContent = "\uFEFF" + csvLinhas.map(r => r.join(";")).join("\n");
    const csvFile = pastaContagem.createFile(`Contagem_${labelContagens}_${dataAtual}.csv`, csvContent, MimeType.CSV);

    // ✅ Cria PDF
    const pdfBlob = gerarPDFContagem(itens, usuario);
    const pdfFile = pastaContagem.createFile(pdfBlob).setName(`Contagem_${labelContagens}_${dataAtual}.pdf`);

    // ✅ Envia e-mail com anexos
    enviarEmailEncerramento(usuario, itens, pdfFile, csvFile, dataAtual, labelContagens, filiaisUnicas, almoxUnicos);

    // ✅ REMOVE AUTOMATICAMENTE TODOS OS JSONS DAS CONTAGENS ENCERRADAS
    if (contagensUnicas.length > 0) {
      Logger.log(`🧹 Removendo caches das contagens encerradas: ${contagensUnicas.join(", ")}`);
      removerCachesEncerrados(contagensUnicas);
    }

    return { sucesso: true, pdfUrl: pdfFile.getUrl(), csvUrl: csvFile.getUrl() };
  } catch (e) {
    Logger.log("❌ Erro ao encerrar contagem: " + e);
    return { sucesso: false, mensagem: e.toString() };
  }
}

/**************************************
 * LISTAR CONTAGENS ANTERIORES
 **************************************/
function listarContagens() {
  const pastaFinal = DriveApp.getFolderById(DRIVE_CONTAGENS_FOLDER_ID);
  let lista = [];
  const pastas = pastaFinal.getFolders();

  while (pastas.hasNext()) {
    const pasta = pastas.next();
    const arquivos = pasta.getFiles();
    let pdfUrl = "";
    let csvUrl = "";

    while (arquivos.hasNext()) {
      const file = arquivos.next();
      if (file.getName().endsWith(".pdf")) pdfUrl = file.getUrl();
      if (file.getName().endsWith(".csv")) csvUrl = file.getUrl();
    }

    lista.push({
      nome: pasta.getName(),
      pdfUrl: pdfUrl,
      csvUrl: csvUrl
    });
  }

  return lista;
}

/**************************************
 * CARREGAR CSV CONSULTAR ENCERRADOS
 **************************************/

function getBaseCSV(filialUsuario) {
  try {
    const planilha = SpreadsheetApp.openById(PLANILHA_ID);
    const aba = planilha.getSheetByName("baseCSV");

    if (!aba) {
      Logger.log("⚠️ Aba baseCSV não encontrada.");
      return [];
    }

    const dados = aba.getDataRange().getValues();
    if (!dados || dados.length <= 1) {
      Logger.log("⚠️ Nenhum registro encontrado na baseCSV.");
      return [];
    }

    let registros = [];

    for (let i = 1; i < dados.length; i++) {
      let linha = dados[i];

      // ✅ Coluna de data sempre legível
      let dataVal = linha[6]; // Coluna 7 (data)
      let dataFormatada = "";

      if (dataVal instanceof Date) {
        dataFormatada = Utilities.formatDate(dataVal, Session.getScriptTimeZone(), "dd/MM/yyyy");
      } else {
        dataFormatada = String(dataVal || "").trim();
      }

      let filialLinha = String(linha[4] || "").trim();

      // ✅ FILTRO: Se não for ADM, só traz a filial do usuário
      if (filialUsuario !== "ADM" && filialUsuario !== filialLinha) {
        continue;
      }

      registros.push({
        contagem: String(linha[0] || "").trim(),
        codigo: String(linha[1] || "").trim(),
        nome: String(linha[2] || "").trim(),
        almoxarifado: String(linha[3] || "").trim(),
        filial: filialLinha,
        quantidade: String(linha[5] || "").trim(),
        data: dataFormatada
      });
    }

    Logger.log(`✅ Total de registros carregados da baseCSV (após filtro): ${registros.length}`);
    return registros;

  } catch (e) {
    Logger.log("❌ Erro ao ler baseCSV: " + e);
    return [];
  }
}

/**************************************
 * LER CSV REMOTAMENTE
 **************************************/
function lerCSVContagem(url) {
  try {
    const idArquivo = url.match(/[-\w]{25,}/)[0];
    const arquivo = DriveApp.getFileById(idArquivo);
    const conteudo = arquivo.getBlob().getDataAsString();
    return Utilities.parseCsv(conteudo);
  } catch (e) {
    return [];
  }
}

/**************************************
 * EXCLUIR CACHES DRIVE (EM CONSULTA)
 **************************************/
function removerCachesPorArquivo(listaArquivos) {
  if (!Array.isArray(listaArquivos) || listaArquivos.length === 0) return;

  const pastaTemp = DriveApp.getFolderById(DRIVE_TEMP_FOLDER_ID);
  const arquivos = pastaTemp.getFiles();
  let removidos = [];

  while (arquivos.hasNext()) {
    let file = arquivos.next();
    let nome = file.getName();

    if (listaArquivos.includes(nome)) {
      file.setTrashed(true);
      removidos.push(nome);
      Logger.log(`✅ Cache removido: ${nome}`);
    }
  }

  Logger.log(`🧹 Total de caches removidos: ${removidos.length}`);
  return true;
}



/**************************************
 * FRONT-END
 **************************************/

function doGet(e) {
  const action = e.parameter.action;
  if (action === "login") {
    const codigo = e.parameter.codigo;
    const usuario = validarLogin(codigo);
    return ContentService.createTextOutput(
      JSON.stringify(usuario)
    ).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(
    JSON.stringify({ sucesso: false, msg: "Ação inválida" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function validarLogin(codigo) {
  const usuarios = {
    "1000483": "Lucas Vidal",
    "9999": "Administrador"
  };
  if (usuarios[codigo]) {
    return { sucesso: true, nome: usuarios[codigo] };
  }
  return { sucesso: false };
}
