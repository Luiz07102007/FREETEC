(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const soDigitos = v => v.replace(/\D/g, '');

  /* ---------- Abas (aluno / contratante) ---------- */
  const abas = $$('[role="tab"]');

  function selecionarAba(aba) {
    abas.forEach(a => {
      const ativa = a === aba;
      a.setAttribute('aria-selected', ativa);
      a.tabIndex = ativa ? 0 : -1;
      $('#' + a.getAttribute('aria-controls')).hidden = !ativa;
    });
  }

  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => selecionarAba(aba));
    aba.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const passo = e.key === 'ArrowRight' ? 1 : -1;
      const proxima = abas[(i + passo + abas.length) % abas.length];
      proxima.focus();
      selecionarAba(proxima);
    });
  });

  /* ---------- CPF e CNPJ ---------- */
  function cpfValido(c) {
    if (/^(\d)\1+$/.test(c)) return false;
    for (const t of [9, 10]) {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += c[i] * (t + 1 - i);
      if (((soma * 10) % 11) % 10 !== Number(c[t])) return false;
    }
    return true;
  }

  function cnpjValido(c) {
    if (/^(\d)\1+$/.test(c)) return false;
    const dv = n => {
      const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let soma = 0;
      for (let i = 0; i < n; i++) soma += c[i] * pesos[i];
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
  }

  function mascaraDocumento(v) {
    const d = soDigitos(v).slice(0, 14);
    if (d.length <= 11) {
      return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  }

  /* ---------- Skills (chips) ---------- */
  const skills = [];
  const skillInput = $('#skill-input');
  const chips = $('#chips');

  function renderSkills() {
    chips.replaceChildren(...skills.map((nome, i) => {
      const li = document.createElement('li');
      li.className = 'chip';
      li.append(nome);
      const x = document.createElement('button');
      x.type = 'button';
      x.textContent = '×';
      x.setAttribute('aria-label', 'Remover ' + nome);
      x.addEventListener('click', () => {
        skills.splice(i, 1);
        renderSkills();
        if (skillInput.getAttribute('aria-invalid') === 'true') validar(skillInput);
        skillInput.focus();
      });
      li.append(x);
      return li;
    }));
  }

  function adicionarSkill() {
    const nome = skillInput.value.trim().replace(/,$/, '');
    skillInput.value = '';
    if (!nome || skills.length >= 15) return;
    if (skills.some(s => s.toLowerCase() === nome.toLowerCase())) return;
    skills.push(nome);
    renderSkills();
  }

  skillInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      adicionarSkill();
      validar(skillInput);
    }
  });
  // Escolher uma sugestão da lista também adiciona a skill
  skillInput.addEventListener('input', e => {
    if (e.inputType === 'insertReplacementText' || !e.inputType) adicionarSkill();
  });

  /* ---------- Regras de validação ---------- */
  const msgPortfolio = 'Use um link https do GitHub ou do LinkedIn.';

  const regras = {
    nome: v => v.trim().length >= 3 || 'Informe o nome completo.',
    area: v => v.trim().length >= 2 || 'Informe a área de atuação.',
    emailFatec: v => {
      if (!v.trim()) return 'Informe seu e-mail institucional.';
      return /^[^\s@]+@([a-z0-9-]+\.)*fatec\.sp\.gov\.br$/i.test(v.trim())
        || 'Use seu e-mail institucional (@fatec.sp.gov.br).';
    },
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Informe um e-mail válido.',
    senha: v => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v))
      || 'A senha precisa ter 8 caracteres, com letras e números.',
    nascimento: v => {
      const d = new Date(v);
      if (!v || isNaN(d)) return 'Informe a data de nascimento.';
      return (d <= new Date() && d.getFullYear() >= 1900) || 'Confira a data de nascimento.';
    },
    obrigatorio: v => !!v || 'Escolha uma opção.',
    documento: v => {
      const d = soDigitos(v);
      return (d.length === 11 && cpfValido(d)) || (d.length === 14 && cnpjValido(d))
        || 'Informe um CPF ou CNPJ válido.';
    },
    skills: () => skills.length > 0 || 'Adicione pelo menos uma skill.',
    portfolio: v => {
      if (!v.trim()) return true;
      try {
        const u = new URL(v.trim());
        return (u.protocol === 'https:' && /(^|\.)(github|linkedin)\.com$/i.test(u.hostname)) || msgPortfolio;
      } catch {
        return msgPortfolio;
      }
    }
  };

  function validar(campo) {
    const resultado = regras[campo.dataset.rule](campo.value);
    const ok = resultado === true;
    campo.setAttribute('aria-invalid', String(!ok));
    campo.closest('.field').querySelector('.erro').textContent = ok ? '' : resultado;
    return ok;
  }

  $$('[data-rule]').forEach(campo => {
    campo.addEventListener('blur', () => {
      if (campo === skillInput) adicionarSkill();
      if (campo.value || campo.getAttribute('aria-invalid') || campo === skillInput && skills.length) validar(campo);
    });
    const revalidar = () => { if (campo.getAttribute('aria-invalid') === 'true' && campo !== skillInput) validar(campo); };
    campo.addEventListener('input', revalidar);
    campo.addEventListener('change', revalidar);
  });

  $$('[data-mask="documento"]').forEach(campo =>
    campo.addEventListener('input', () => { campo.value = mascaraDocumento(campo.value); }));

  /* ---------- Mostrar / ocultar senha ---------- */
  $$('.ver').forEach(botao => botao.addEventListener('click', () => {
    const campo = botao.previousElementSibling;
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    botao.setAttribute('aria-pressed', String(mostrar));
  }));

  /* ---------- Envio ---------- */
  function mostrarSucesso(form, dados) {
    $('.abas').hidden = true;
    $$('form').forEach(f => { f.hidden = true; });
    $('.nota').hidden = true;
    const primeiroNome = dados.nome.trim().split(/\s+/)[0];
    const aluno = form.id === 'form-aluno';
    $('#sucesso-titulo').textContent = 'Conta criada, ' + primeiroNome + '.';
    $('#sucesso-texto').textContent = aluno
      ? 'Já dá para ver os projetos compatíveis com as suas skills e o seu semestre.'
      : 'Agora você pode anunciar o seu primeiro projeto e receber candidaturas de alunos da Fatec.';
    $('#sucesso').hidden = false;
    $('#sucesso-titulo').focus();
  }

  $$('form').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const invalidos = $$('[data-rule]', form).filter(c => !validar(c));
    if (invalidos.length) { invalidos[0].focus(); return; }

    const dados = Object.fromEntries(new FormData(form));
    delete dados.senha; // a senha nunca deve ficar em objetos de log ou de tela
    if (form.id === 'form-aluno') dados.skills = [...skills];
    if (dados.documento) dados.documento = soDigitos(dados.documento);

    const botao = $('button[type="submit"]', form);
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = 'Criando conta…';

    // TODO: trocar a simulação pela chamada ao back-end, enviando também a senha:
    // fetch('/api/cadastro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, ...dados, senha }) })
    setTimeout(() => {
      botao.disabled = false;
      botao.textContent = textoOriginal;
      mostrarSucesso(form, dados);
    }, 700);
  }));
})();
