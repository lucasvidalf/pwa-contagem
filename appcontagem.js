

const API_URL = "https://script.google.com/macros/s/AKfycbxMXlGfKgoImTIsxtOZ4Uy451gQ9LqTVn2uknqfLL-BB6lcywsN93C1FKByAJ2idIQM2A/exec";

    let usuarioLogado = localStorage.getItem("usuarioLogado") || "";
    let itensRegistrados = [];
    let produtosCarregados = [];

    /* ================= MODAL ================= */
    function showModal(titulo, mensagem) {
      alert(`${titulo}\n\n${mensagem}`);
    }
          
    /* ================= LOGIN ================= */
    async function fazerLogin() {
      const codigo = document.getElementById('codigoLogin').value.trim();
      const msg = document.getElementById('msgLogin');
    
      if (!codigo) {
        msg.innerHTML = "<span class='erro'>⚠️ Digite seu código!</span>";
        return;
      }
    
      msg.innerHTML = "⏳ Verificando...";
    
      try {
        const resposta = await fetch(`${API_URL}?action=login&codigo=${codigo}`);
        const data = await resposta.json();
    
        if (data.sucesso) {
          usuarioLogado = data.nome;
          localStorage.setItem("usuarioLogado", data.nome);
          localStorage.setItem("filialUsuario", data.filial || "ADM");
    
          document.getElementById('loginBox').style.display = 'none';
          document.getElementById('bemVindoBox').style.display = 'block';
          document.getElementById('nomeUsuario').innerText = "Bem-vindo(a), " + data.nome + "!";
        } else {
          msg.innerHTML = "<span class='erro'>❌ Código inválido!</span>";
        }
    
      } catch (erro) {
        console.error("Erro ao conectar:", erro);
        msg.innerHTML = "<span class='erro'>❌ Erro ao conectar ao servidor.</span>";
      }
    }
    
   
    /*==========EVENTO CONTAGEM=========*/

      function configurarEventoContagem() {
        const select = document.getElementById("contagem");
        select.addEventListener("change", () => {
          const contagemSelecionada = select.value;
          const produtos = produtosCarregados.filter(p => p.contagem === contagemSelecionada);
      
          if (produtos.length > 0) {
            document.getElementById("filial").value = produtos[0].filial;
            document.getElementById("almoxarifado").value = produtos[0].almoxarifado;
      
            const datalist = document.getElementById("listaCodigos");
            datalist.innerHTML = "";
            produtos.forEach(p => {
              const opt = document.createElement("option");
              opt.value = p.codigo;
              datalist.appendChild(opt);
            });
          }
        });
      }
    
    /* ================= CARREGAR PRODUTOS ================= */
    async function carregarProdutos() {
      try {
        const resposta = await fetch(`${API_URL}?action=getProdutos`);
        produtosCarregados = await resposta.json();
      } catch (e) {
        console.error("Erro ao carregar produtos:", e);
        produtosCarregados = [];
      }
    }
    
    /* ================= ABRIR CONTAGEM ================= */
    async function abrirContagem(nova) {
      document.getElementById('bemVindoBox').style.display = 'none';
      document.getElementById('contagemBox').style.display = 'block';
      document.getElementById('usuarioContagem').innerText = localStorage.getItem("usuarioLogado");
      document.getElementById('dataContagem').value = new Date().toLocaleDateString('pt-BR');
    
      if (nova) {
        itensRegistrados = [];
        await carregarProdutos();
        preencherContagensDisponiveis(produtosCarregados);
        configurarEventoContagem();       
      } else {
        fetch(`${API_URL}?action=recuperarItensTemp`)
          .then(res => res.json())
          .then(data => {
            itensRegistrados = data.itens || [];
            atualizarListaItens();    
          });
      }
    }     
    /* ================= PREENCHER CONTAGENS DISPONÍVEIS ================= */
    function preencherContagensDisponiveis() {
      const select = localStorage.getItem("contagem");
      const filial = document.getElementById("filialUsuario");
      const contagens = [...new Set(produtos
        .filter(p => p.filial === filial)
        .map(p => p.contagem)
        .filter(c => c))];
    
      select.innerHTML = "<option value=''>Selecione...</option>";
      contagens.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.innerText = c;
        select.appendChild(opt);
      });
    }

    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("contagem").addEventListener("change", () => {
        const selecionada = document.getElementById("contagem").value;
        const produtos = produtosCarregados.filter(p => p.contagem === selecionada);
        if (produtos.length > 0) {
          document.getElementById("filial").value = produtos[0].filial;
          document.getElementById("almoxarifado").value = produtos[0].almoxarifado;

          const datalist = document.getElementById("listaCodigos");
          datalist.innerHTML = "";
          produtos.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.codigo;
            datalist.appendChild(opt);
          });
        }
      });
    });
    
    /* ================= ATUALIZAR LISTA DE ITENS ================= */
    function atualizarListaItens() {
      const listaDiv = document.getElementById("listaItens");
      const tituloItens = document.getElementById("tituloItens");
      const total = itensRegistrados.length;
      tituloItens.textContent = `📦 Itens lançados (${total})`;
      if (total === 0) {
        listaDiv.innerHTML = `<p>⚠️ Nenhum item registrado ainda.</p>`;
        return;
      }
      let html = "";
      itensRegistrados.forEach((item, index) => {
        html += `
          <div class="item-lancado">
            <div class="item-info">
              <b>${item.codigo}</b> - ${item.nome} (${item.quantidade})
            </div>
            <div class="item-remove" onclick="removerItem(${index})">❌</div>
          </div>
        `;
      });
      listaDiv.innerHTML = html;
    }
    
    /* ================= REGISTRAR ITEM ================= */
    function registrarItem() {
      const btn = document.getElementById('btnRegistrar');
      btn.disabled = true;
      btn.innerText = "⏳ Registrando...";
    
      const contagemSel = document.getElementById('contagem').value;
      const filialSel = document.getElementById('filial').value;
      const almoxSel = document.getElementById('almoxarifado').value;
      const codigo = document.getElementById('codigo').value.trim();
      const nome = document.getElementById('nomeItem').value.trim();
      const quantidade = document.getElementById('quantidade').value.trim();
      const comentario = document.getElementById('comentario').value.trim();
      const fotoInput = document.getElementById('foto').files[0];
    
      if (!contagemSel || !filialSel || !almoxSel || !codigo || !nome || !quantidade || !fotoInput) {
        showModal('Campos obrigatórios', '⚠️ Preencha todos os campos antes de registrar.');
        btn.disabled = false;
        btn.innerText = "✅ Registrar Item";
        return;
      }
    
      const dados = {
        usuario: usuarioLogado,
        contagem: contagemSel,
        filial: filialSel,
        almoxarifado: almoxSel,
        codigo,
        nome,
        quantidade,
        comentario
      };
    
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;
    
          if (width > height && width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          } else if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
    
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
    
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.5);
          dados.fotoBase64 = compressedDataUrl.split(",")[1];
    
          salvarItemServidor(dados, btn);
        };
    
        img.onerror = function () {
          showModal("❌ Erro", "Falha ao carregar imagem.");
          btn.disabled = false;
          btn.innerText = "✅ Registrar Item";
        };
    
        img.src = e.target.result;
      };
    
      reader.onerror = function () {
        showModal("❌ Erro", "Erro ao ler a foto.");
        btn.disabled = false;
        btn.innerText = "✅ Registrar Item";
      };
    
      reader.readAsDataURL(fotoInput);
    }
    
    /* ================= SALVAR ITEM NO SERVIDOR ================= */
    async function salvarItemServidor(dados, btnRef) {
      try {
        const resposta = await fetch(API_URL, {
          method: "POST",
          body: `dados=${encodeURIComponent(JSON.stringify({
            action: "salvarItemContagem",
            dados: dados
          }))}`,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
    
        const result = await resposta.json();
        btnRef.disabled = false;
        btnRef.innerText = "✅ Registrar Item";
    
        if (result.sucesso) {
          itensRegistrados.push(dados);
          atualizarListaItens();
          salvarEstadoTela("contagem");
    
          document.getElementById('codigo').value = '';
          document.getElementById('nomeItem').value = '';
          document.getElementById('quantidade').value = '';
          document.getElementById('comentario').value = '';
          document.getElementById('foto').value = '';
    
          showModal("✅ Sucesso", "Item registrado com sucesso!");
        } else {
          showModal("❌ Erro", "Falha ao salvar: " + result.mensagem);
        }
      } catch (e) {
        console.error("Erro ao salvar:", e);
        btnRef.disabled = false;
        btnRef.innerText = "✅ Registrar Item";
        showModal("❌ Erro", "Erro ao conectar ao servidor.");
      }
    }
    
    /* ================= OUTRAS FUNÇÕES ================= */
    function removerItem(index) {
      itensRegistrados.splice(index, 1);
      atualizarListaItens();
    }
    
    function fazerLogout() {
      usuarioLogado = "";
      localStorage.removeItem("usuarioLogado");
      document.getElementById('bemVindoBox').style.display = 'none';
      document.getElementById('contagemBox').style.display = 'none';
      document.getElementById('loginBox').style.display = 'flex';
      document.getElementById('codigoLogin').value = "";
    }
    
    function voltarMenu() {
      document.getElementById('consultarBox').style.display = 'none';
      document.getElementById('contagensAbertasBox').style.display = 'none';
      document.getElementById('contagemBox').style.display = 'none';
      document.getElementById('bemVindoBox').style.display = 'flex';
      document.getElementById('listaItens').innerHTML = "";
      document.getElementById('tituloItens').textContent = "";
    }
    
    function encerrarContagem() {
      if (itensRegistrados.length === 0) {
        showModal("⚠️ Atenção", "Não há itens para encerrar a contagem.");
        return;
      }
    
      const dados = {
        usuario: usuarioLogado,
        filial: document.getElementById("filial").value,
        contagem: document.getElementById("contagem").value,
        itens: itensRegistrados
      };
    
      fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `dados=${encodeURIComponent(JSON.stringify({
          action: "encerrarContagem",
          dados: dados
        }))}`
      })
        .then(res => res.json())
        .then(resposta => {
          if (resposta.sucesso) {
            showModal("✅ Contagem Encerrada", "Contagem encerrada com sucesso. PDF/CSV foram enviados por e-mail.");
            voltarMenu();
          } else {
            showModal("❌ Erro", "Erro ao encerrar: " + resposta.mensagem);
          }
        })
        .catch(erro => {
          console.error("Erro ao encerrar contagem:", erro);
          showModal("❌ Erro", "Erro ao conectar ao servidor.");
        });
    }
