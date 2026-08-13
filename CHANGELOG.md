# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.
All notable changes to this project will be documented here.

O formato segue / The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

App releases use datetime versioning (`YYYY.MM.DD.HHmm`).
Kotlin and RN bundle versions follow Semantic Versioning independently.

## [Unreleased]

## [[2026.08.13.1211](https://github.com/paulopotter/my-kavita-app-reader/releases/tag/2026.08.13.1211)] - 2026-08-13

Agora o app permite que você organize melhor suas séries e capítulos, com novas opções de ordenação e marcação de leitura. / Now the app allows you to better organize your series and chapters, with new sorting options and reading marks.

### **Backend** - `0.6.0`

**[pt-BR]**
- Sua lista de capítulos agora pode ser ordenada de acordo com sua preferência, com opções de prioridade e marcação de lido ou não lido.
- A autenticação foi corrigida para evitar erros de acesso ao app.
- As rotas de sincronização de séries e capítulos foram corrigidas para evitar erros 404.
- O app agora exige autenticação válida antes de liberar o acesso.
- A ordenação automática por progresso de leitura foi adicionada para ajudar a encontrar o próximo capítulo.

**[en]**
- Your chapter list can now be sorted according to your preference, with priority options and read or unread marks.
- Authentication was fixed to prevent access errors.
- Series and chapter synchronization routes were fixed to prevent 404 errors.
- The app now requires valid authentication before granting access.
- Automatic sorting by reading progress was added to help find the next chapter.

### **Frontend** - `0.7.0`

**[pt-BR]**
- Um novo modal de configuração de ordenação de capítulos foi adicionado, acessível pela tela de série e por uma nova seção em Ajustes.
- O botão de voltar ao topo na lista de capítulos foi adicionado para melhorar a navegação.
- Os ícones da barra de navegação inferior foram substituídos por ícones vetoriais para melhorar a aparência.
- A lista "Seguindo" agora atualiza automaticamente quando uma série é seguida ou deixada de seguir em outra tela.
- A validação dos campos de configuração de ordenação foi adicionada para impedir valores inválidos.

**[en]**
- A new chapter sorting configuration modal was added, accessible from the series screen and a new section in Settings.
- A back to top button was added to the chapter list to improve navigation.
- The bottom navigation bar icons were replaced with vector icons to improve appearance.
- The "Following" list now updates automatically when a series is followed or unfollowed from another screen.
- Validation was added to the sorting configuration fields to prevent invalid values.

## [[2026.08.12.1048](https://github.com/paulopotter/my-kavita-app-reader/releases/tag/2026.08.12.1048)] - 2026-08-12

Agora o app exibe apenas as séries marcadas com estrela na aba "Seguindo" com layout de grid e ordenação independentes. / The app now displays only starred series in the "Following" tab with independent grid layout and sorting.

### **Backend** - `0.5.0`

**[pt-BR]**
- Sem alterações nesta versão

**[en]**
- No changes in this version

### **Frontend** - `0.6.0`

**[pt-BR]**
- A aba "Seguindo" exibe apenas as séries que você marcou com estrela, com um layout de grid e ordenação independentes da Biblioteca
- A aba "Seguindo" aparece automaticamente quando você está seguindo séries e some quando não há nenhuma série sendo seguida
- Ao marcar ou desmarcar uma série, a aba "Seguindo" é atualizada em tempo real sem precisar reiniciar o app

**[en]**
- The "Following" tab now displays only the series you've starred, with an independent grid layout and sorting
- The "Following" tab appears automatically when you're following series and disappears when you're not following any
- When you star or unstar a series, the "Following" tab updates in real-time without requiring a restart

## [[2026.08.12.1009](https://github.com/paulopotter/my-kavita-app-reader/releases/tag/2026.08.12.1009)] - 2026-08-12

Agora o app sincroniza suas séries e capítulos automaticamente na abertura e apresenta uma nova tela de splash com barra de progresso animada. / The app now synchronizes your series and chapters automatically on startup and features a new splash screen with an animated progress bar.

### **Backend** - `0.5.0`

**[pt-BR]**
- Sua biblioteca é sincronizada automaticamente quando você abre o app.
- O app agora armazena as políticas de atualização recebidas do manifesto e as expõe via uma ponte de eventos.
- As configurações do app são salvas mesmo após fechá-lo.
- O app não ignora mais a tela de splash após um stop forçado.
- O sistema de políticas de atualização foi implementado com diálogos temáticos.

**[en]**
- Your library is now synchronized automatically when you open the app.
- The app now stores the update policies received from the manifest and exposes them via an event bridge.
- The app's settings are saved even after closing it.
- The app no longer ignores the splash screen after a forced stop.
- The update policy system has been implemented with themed dialogs.

### **Frontend** - `0.5.0`

**[pt-BR]**
- Uma nova tela de splash com barra de progresso animada foi adicionada.
- O app apresenta uma navegação principal com abas inferiores para Biblioteca e Configurações.
- Telas placeholder foram adicionadas para as seções Following, Search, Reader, Notifications e SeriesDetail.
- Um componente de diálogo reutilizável foi criado com tema da app.
- A imagem da splash agora é exibida corretamente em dispositivos xxxhdpi.

**[en]**
- A new splash screen with an animated progress bar has been added.
- The app features a main navigation with bottom tabs for Library and Settings.
- Placeholder screens have been added for the Following, Search, Reader, Notifications, and SeriesDetail sections.
- A reusable dialog component has been created with the app's theme.
- The splash image is now displayed correctly on xxxhdpi devices.

## [[2026.08.11.1628](https://github.com/paulopotter/my-kavita-app-reader/releases/tag/2026.08.11.1628)] - 2026-08-11

Agora o app tem uma tela de biblioteca com listagem de séries e configurações de servidor. / The app now has a library screen with series listing and server settings.

### **Backend** - `0.4.0`

**[pt-BR]**
- Sua biblioteca é carregada automaticamente quando você abre o app.
- Você pode alternar entre modos de visualização e ordenação das séries.
- As séries podem ser marcadas como favoritas para acesso rápido.
- O app salva suas configurações de idioma e servidor.
- O cache de biblioteca é atualizado a cada 2 minutos.

**[en]**
- Your library is loaded automatically when you open the app.
- You can switch between viewing modes and series sorting.
- Series can be marked as favorites for quick access.
- The app saves your language and server settings.
- The library cache is updated every 2 minutes.

### **Frontend** - `0.4.0`

**[pt-BR]**
- Nova tela de biblioteca com lista de séries em duas colunas.
- Modo lista com metadados e estrela de favorito.
- Barra superior com contagem de séries e opções de visualização.
- Tela de configuração reestruturada com submenus.
- Opção de internacionalização com switch ao vivo.

**[en]**
- New library screen with a two-column series list.
- List mode with metadata and favorite star.
- Top bar with series count and viewing options.
- Restructured settings screen with submenus.
- Internationalization option with live switch.

## [[2026.08.11.0302](https://github.com/paulopotter/my-kavita-app-reader/releases/tag/2026.08.11.0302)] - 2026-08-11

Agora você pode desfrutar de melhorias no aplicativo My Manga Reader. / You can now enjoy improvements in the My Manga Reader app.

### **Backend** - `0.2.0`

**[pt-BR]**
- As atualizações do aplicativo agora são feitas de forma transparente, sem a necessidade de reinstalar o APK. 
- O aplicativo agora exibe as versões do backend, app e frontend na tela de splash.
- A integridade do bundle é validada via SHA-256 para garantir a segurança.
- O aplicativo agora faz rollback automático para o bundle anterior em caso de crash.
- Foram implementadas políticas de update para garantir a estabilidade do aplicativo.

**[en]**
- The app updates are now done transparently, without the need to reinstall the APK.
- The app now displays the versions of the backend, app, and frontend on the splash screen.
- The bundle integrity is validated via SHA-256 to ensure security.
- The app now automatically rolls back to the previous bundle in case of a crash.
- Update policies have been implemented to ensure app stability.

### **Frontend** - `0.2.0`

**[pt-BR]**
- A tela de configurações agora tem um fundo escuro e respeita a barra de status.
- As versões do backend, app e frontend são exibidas no rodapé da tela de configurações.
- Sem alterações adicionais nesta versão.

**[en]**
- The settings screen now has a dark background and respects the status bar.
- The versions of the backend, app, and frontend are displayed in the footer of the settings screen.
- No additional changes in this version.

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

