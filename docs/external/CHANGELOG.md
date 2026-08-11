# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.
All notable changes to this project will be documented here.

O formato segue / The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

App releases use datetime versioning (`YYYY.MM.DD.HHmm`).
Kotlin and RN bundle versions follow Semantic Versioning independently.

## [Unreleased]

## [[2026.08.11.0244](https://github.com/paulopotter/my-kavita-app-reader/releases/tag/2026.08.11.0244)] - 2026-08-11

Nova versão do My Manga Reader com melhorias e correções. / New version of My Manga Reader with improvements and fixes.

### **Backend** - `0.1.0`

**[pt-BR]**
- As atualizações agora são baixadas e instaladas automaticamente sem a necessidade de reinstalar o aplicativo.
- A tela de splash agora exibe as versões do backend, app e frontend.
- O aplicativo valida a integridade do bundle via SHA-256 para garantir a segurança.
- Em caso de crash, o aplicativo realiza um rollback automático para o bundle anterior.
- Foram implementadas políticas de update para garantir a estabilidade do aplicativo.

**[en]**
- Updates are now downloaded and installed automatically without the need to reinstall the app.
- The splash screen now displays the versions of the backend, app, and frontend.
- The app validates the integrity of the bundle via SHA-256 to ensure security.
- In case of a crash, the app automatically rolls back to the previous bundle.
- Update policies have been implemented to ensure app stability.

### **Frontend** - `0.1.0`

**[pt-BR]**
- A tela de configurações agora tem um fundo escuro e respeita a barra de status.
- As versões do backend, app e frontend são exibidas no rodapé da tela de configurações.
- Sem alterações adicionais nesta versão.

**[en]**
- The settings screen now has a dark background and respects the status bar.
- The versions of the backend, app, and frontend are displayed in the footer of the settings screen.
- No additional changes in this version.

## [[2026.08.10.2028](https://github.com/paulopotter/my-kavita-app-reader/releases/tag/2026.08.10.2028)] - 2026-08-10

Agora você pode desfrutar de melhorias no aplicativo My Manga Reader. / You can now enjoy improvements in the My Manga Reader app.

### **Backend** - `0.1.0`

**[pt-BR]**
- Suas configurações são salvas mesmo ao fechar o app
- O aplicativo pode selecionar automaticamente o melhor endereço para o seu servidor
- Agora você pode fazer login na sua biblioteca Kavita
- O aplicativo armazena suas preferências de UI de forma segura
- O aplicativo valida as configurações do servidor antes de conectá-lo

**[en]**
- Your settings are saved even when you close the app
- The app can automatically find the best address for your server
- You can now log in to your Kavita library
- The app stores your UI preferences securely
- The app validates server settings before connecting to it

### **Frontend** - `0.1.0`

**[pt-BR]**
- Nova tela de configurações com seções para servidor, login e preferências
- Interface visual conectada ao servidor nativo
- O aplicativo exibe uma tela de configuração intuitiva e fácil de usar
- Você pode facilmente navegar pelas diferentes seções da tela de configuração
- A tela de configuração é responsiva e se adapta a diferentes tamanhos de tela

**[en]**
- New settings screen with sections for server, login, and preferences
- Visually connected interface to the native server
- The app displays an intuitive and easy-to-use settings screen
- You can easily navigate through the different sections of the settings screen
- The settings screen is responsive and adapts to different screen sizes

