.PHONY: setup build-android build-bundle deploy log help

ANDROID_DIR  := android
FRONTEND_DIR := frontend

# Detect language from system locale (default: English)
LANG_IS_PT := $(shell echo "$$LANG $$LC_ALL $$LANGUAGE" | grep -qi 'pt_BR\|pt_PT\|portuguese' && echo 1 || echo 0)

ifeq ($(LANG_IS_PT),1)
MSG_HELP          := Mostra este menu de ajuda / Shows this help menu
MSG_SETUP         := Valida dependências e instala pacotes JS
MSG_BUILD_ANDROID := Gera APK de debug
MSG_BUILD_BUNDLE  := Gera bundle JS (React Native / Expo)
MSG_DEPLOY        := Instala o APK no dispositivo físico via USB
MSG_LOG           := Exibe logs do app em tempo real via adb logcat
MSG_CHECKING_DEPS := → Verificando dependências...
MSG_NO_NODE       := ✗ node não encontrado
MSG_NO_YARN       := ✗ yarn não encontrado
MSG_NO_JAVA       := ✗ java não encontrado
MSG_NO_ADB        := ✗ adb não encontrado (instale Android platform-tools)
MSG_NO_ENV        := ✗ .env não encontrado — copie .env.example e preencha
MSG_CONVERT_ENV   := → Convertendo .env → local.properties...
MSG_INSTALL_JS    := → Instalando dependências JS...
MSG_READY         := ✓ Ambiente pronto
MSG_BUILDING_APK  := → Compilando APK...
MSG_APK_DONE      := ✓ APK gerado
MSG_BUILDING_BNDL := → Gerando bundle JS...
MSG_BUNDLE_DONE   := ✓ Bundle gerado
MSG_DEPLOYING     := → Instalando no dispositivo...
MSG_DEPLOY_DONE   := ✓ Instalado
else
MSG_HELP          := Shows this help menu / Mostra este menu de ajuda
MSG_SETUP         := Validate dependencies and install JS packages
MSG_BUILD_ANDROID := Build debug APK
MSG_BUILD_BUNDLE  := Build JS bundle (React Native / Expo)
MSG_DEPLOY        := Install APK on physical device via USB
MSG_LOG           := Stream app logs via adb logcat
MSG_CHECKING_DEPS := → Checking dependencies...
MSG_NO_NODE       := ✗ node not found
MSG_NO_YARN       := ✗ yarn not found
MSG_NO_JAVA       := ✗ java not found
MSG_NO_ADB        := ✗ adb not found (install Android platform-tools)
MSG_NO_ENV        := ✗ .env not found — copy .env.example and fill in your values
MSG_CONVERT_ENV   := → Converting .env → local.properties...
MSG_INSTALL_JS    := → Installing JS dependencies...
MSG_READY         := ✓ Environment ready
MSG_BUILDING_APK  := → Building APK...
MSG_APK_DONE      := ✓ APK built
MSG_BUILDING_BNDL := → Building JS bundle...
MSG_BUNDLE_DONE   := ✓ Bundle built
MSG_DEPLOYING     := → Installing on device...
MSG_DEPLOY_DONE   := ✓ Done
endif

help: ## help
	@printf "  \033[36m%-18s\033[0m %s\n" "help"          "$(MSG_HELP)"
	@printf "  \033[36m%-18s\033[0m %s\n" "setup"         "$(MSG_SETUP)"
	@printf "  \033[36m%-18s\033[0m %s\n" "build-android" "$(MSG_BUILD_ANDROID)"
	@printf "  \033[36m%-18s\033[0m %s\n" "build-bundle"  "$(MSG_BUILD_BUNDLE)"
	@printf "  \033[36m%-18s\033[0m %s\n" "deploy"        "$(MSG_DEPLOY)"
	@printf "  \033[36m%-18s\033[0m %s\n" "log"           "$(MSG_LOG)"

setup: ## $(MSG_SETUP)
	@echo "$(MSG_CHECKING_DEPS)"
	@command -v node >/dev/null 2>&1 || { echo "$(MSG_NO_NODE)"; exit 1; }
	@command -v yarn >/dev/null 2>&1 || { echo "$(MSG_NO_YARN)"; exit 1; }
	@command -v java >/dev/null 2>&1 || { echo "$(MSG_NO_JAVA)"; exit 1; }
	@command -v adb  >/dev/null 2>&1 || { echo "$(MSG_NO_ADB)"; exit 1; }
	@[ -f .env ] || { echo "$(MSG_NO_ENV)"; exit 1; }
	@echo "$(MSG_CONVERT_ENV)"
	@scripts/env-to-local-properties.sh
	@echo "$(MSG_INSTALL_JS)"
	@cd $(FRONTEND_DIR) && yarn install
	@echo "$(MSG_READY)"

build-android: ## $(MSG_BUILD_ANDROID)
	@echo "$(MSG_CONVERT_ENV)"
	@scripts/env-to-local-properties.sh
	@echo "$(MSG_BUILDING_APK)"
	@cd $(ANDROID_DIR) && ./gradlew :app:assembleDebug
	@echo "$(MSG_APK_DONE)"

build-bundle: ## $(MSG_BUILD_BUNDLE)
	@echo "$(MSG_BUILDING_BNDL)"
	@cd $(FRONTEND_DIR) && yarn bundle
	@echo "$(MSG_BUNDLE_DONE)"

deploy: ## $(MSG_DEPLOY)
	@echo "$(MSG_DEPLOYING)"
	@[ -f $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk ] || \
	  { echo "$(MSG_BUILDING_APK)"; $(MAKE) build-android; }
	@adb install -r $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk
	@echo "$(MSG_DEPLOY_DONE)"

log: ## $(MSG_LOG)
	@adb logcat -s mymangareader
