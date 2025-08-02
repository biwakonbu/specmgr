# Oracle CLI Build Configuration
ORACLE_CLI_DIR = src/cli
ORACLE_PROJECT = $(ORACLE_CLI_DIR)/OracleCli/OracleCli.fsproj
DIST_DIR = dist
BINARY_NAME = oracle

# Platform detection
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

ifeq ($(UNAME_S),Linux)
    ifeq ($(UNAME_M),x86_64)
        RID = linux-x64
    else ifeq ($(UNAME_M),aarch64)
        RID = linux-arm64
    else
        RID = linux-x64
    endif
else ifeq ($(UNAME_S),Darwin)
    ifeq ($(UNAME_M),arm64)
        RID = osx-arm64
    else
        RID = osx-x64
    endif
else ifeq ($(OS),Windows_NT)
    RID = win-x64
else
    RID = linux-x64
endif

.PHONY: help build build-oracle build-all test test-verbose clean install uninstall info all

help: ## Show this help message
	@echo "Oracle CLI Build System"
	@echo "======================="
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Detected platform: $(RID)"

$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

build: $(DIST_DIR) ## Build Oracle CLI for development
	@echo "Building Oracle CLI for development..."
	cd "$(ORACLE_CLI_DIR)" && dotnet build --configuration Release

build-oracle: $(DIST_DIR) ## Build Oracle CLI single binary for current platform
	@echo "Building Oracle CLI single binary for $(RID)..."
	cd "$(ORACLE_CLI_DIR)" && dotnet publish "OracleCli/OracleCli.fsproj" \
		--configuration Release \
		--runtime $(RID) \
		--self-contained true \
		--output "../../$(DIST_DIR)/$(RID)" \
		-p:PublishSingleFile=true \
		-p:PublishTrimmed=true \
		-p:TrimMode=partial \
		-p:IncludeNativeLibrariesForSelfExtract=true \
		-p:DebugType=None \
		-p:DebugSymbols=false \
		-p:GenerateDocumentationFile=false
	@if [ "$(OS)" = "Windows_NT" ]; then \
		mv $(DIST_DIR)/$(RID)/OracleCli.exe $(DIST_DIR)/$(RID)/$(BINARY_NAME).exe; \
	else \
		mv $(DIST_DIR)/$(RID)/OracleCli $(DIST_DIR)/$(RID)/$(BINARY_NAME); \
		chmod +x $(DIST_DIR)/$(RID)/$(BINARY_NAME); \
	fi
	@# Clean up debug symbols and documentation files
	@rm -f $(DIST_DIR)/$(RID)/*.pdb $(DIST_DIR)/$(RID)/*.xml
	@echo "✅ Oracle CLI binary built: $(DIST_DIR)/$(RID)/$(BINARY_NAME)"

build-all: $(DIST_DIR) ## Build Oracle CLI for all major platforms
	@echo "Building Oracle CLI for all platforms..."
	@for rid in linux-x64 linux-arm64 osx-x64 osx-arm64 win-x64; do \
		echo "Building for $$rid..."; \
		dotnet publish "$(ORACLE_CLI_DIR)/OracleCli/OracleCli.fsproj" \
			--configuration Release \
			--runtime $$rid \
			--self-contained true \
			--output "$(DIST_DIR)/$$rid" \
			-p:PublishSingleFile=true \
			-p:PublishTrimmed=true \
			-p:TrimMode=partial \
			-p:IncludeNativeLibrariesForSelfExtract=true \
			-p:DebugType=None \
			-p:DebugSymbols=false \
			-p:GenerateDocumentationFile=false; \
		if [ "$$rid" = "win-x64" ]; then \
			mv "$(DIST_DIR)/$$rid/OracleCli.exe" "$(DIST_DIR)/$$rid/$(BINARY_NAME).exe"; \
		else \
			mv "$(DIST_DIR)/$$rid/OracleCli" "$(DIST_DIR)/$$rid/$(BINARY_NAME)"; \
			chmod +x "$(DIST_DIR)/$$rid/$(BINARY_NAME)"; \
		fi; \
		rm -f "$(DIST_DIR)/$$rid"/*.pdb "$(DIST_DIR)/$$rid"/*.xml; \
		echo "✅ Built for $$rid"; \
	done
	@echo "🎉 All platform binaries built in $(DIST_DIR)/"

test: ## Run Oracle CLI tests
	@echo "Running Oracle CLI tests..."
	cd "$(ORACLE_CLI_DIR)" && dotnet test --configuration Release --verbosity minimal

test-verbose: ## Run Oracle CLI tests with verbose output
	@echo "Running Oracle CLI tests (verbose)..."
	cd "$(ORACLE_CLI_DIR)" && dotnet test --configuration Release --verbosity detailed

clean: ## Clean build artifacts and dist directory
	@echo "Cleaning Oracle CLI build artifacts..."
	cd "$(ORACLE_CLI_DIR)" && dotnet clean
	rm -rf $(DIST_DIR)
	@echo "✅ Cleaned"

install: build-oracle ## Build and install Oracle CLI to /usr/local/bin (requires sudo)
	@echo "Installing Oracle CLI to /usr/local/bin..."
	@if [ "$(OS)" = "Windows_NT" ]; then \
		echo "Windows installation not supported via Makefile. Copy $(DIST_DIR)/$(RID)/$(BINARY_NAME).exe manually."; \
		exit 1; \
	else \
		sudo cp $(DIST_DIR)/$(RID)/$(BINARY_NAME) /usr/local/bin/$(BINARY_NAME); \
		echo "✅ Oracle CLI installed to /usr/local/bin/$(BINARY_NAME)"; \
		echo "Run 'oracle help' to get started"; \
	fi

uninstall: ## Uninstall Oracle CLI from /usr/local/bin (requires sudo)
	@echo "Uninstalling Oracle CLI from /usr/local/bin..."
	@if [ "$(OS)" = "Windows_NT" ]; then \
		echo "Windows uninstallation not supported via Makefile"; \
		exit 1; \
	else \
		sudo rm -f /usr/local/bin/$(BINARY_NAME); \
		echo "✅ Oracle CLI uninstalled"; \
	fi

info: ## Show build information
	@echo "Oracle CLI Build Information"
	@echo "==========================="
	@echo "Project:        $(ORACLE_PROJECT)"
	@echo "Output:         $(DIST_DIR)/"
	@echo "Binary name:    $(BINARY_NAME)"
	@echo "Target RID:     $(RID)"
	@echo "Platform:       $(UNAME_S) $(UNAME_M)"
	@echo ""
	@echo "Available RIDs:"
	@echo "  linux-x64     - Linux x86_64"
	@echo "  linux-arm64   - Linux ARM64"
	@echo "  osx-x64       - macOS Intel"
	@echo "  osx-arm64     - macOS Apple Silicon"
	@echo "  win-x64       - Windows x64"

# Default target
all: build-oracle