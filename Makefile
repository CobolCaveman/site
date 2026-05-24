# ── CobolCaveman — local dev Makefile ─────────────────────────────────────────
# No Node required locally except for Wrangler (which you already have).
# All other tools are standalone binaries downloaded to ./bin/

HUGO_VERSION     := 0.147.0
TAILWIND_VERSION := 4.1.7
ESBUILD_VERSION  := 0.25.4

# Detect OS + arch
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

ifeq ($(UNAME_S),Darwin)
  HUGO_PLATFORM  := darwin
  TW_PLATFORM    := macos
  ESBUILD_PLATFORM := darwin
else
  HUGO_PLATFORM  := linux
  TW_PLATFORM    := linux
  ESBUILD_PLATFORM := linux
endif

ifeq ($(UNAME_M),arm64)
  HUGO_ARCH    := arm64
  TW_ARCH      := arm64
  ESBUILD_ARCH := arm64
else
  HUGO_ARCH    := amd64
  TW_ARCH      := x64
  ESBUILD_ARCH := x64
endif

# Hugo ships ONE universal binary for macOS (darwin-universal); Linux is per-arch.
ifeq ($(UNAME_S),Darwin)
  HUGO_SUFFIX := darwin-universal
else
  HUGO_SUFFIX := linux-$(HUGO_ARCH)
endif

HUGO      := ./bin/hugo
TAILWIND  := ./bin/tailwindcss
ESBUILD   := ./bin/esbuild

.PHONY: all setup setup-hugo setup-tailwind setup-esbuild \
        worker css site build dev clean

# ── Default ────────────────────────────────────────────────────────────────────
all: build

# ── Setup: download binaries ───────────────────────────────────────────────────
setup: setup-hugo setup-tailwind setup-esbuild
	@echo "✓ All binaries ready in ./bin/"

setup-hugo:
	@mkdir -p bin
	@if [ ! -f $(HUGO) ]; then \
	  echo "→ Downloading Hugo $(HUGO_VERSION)..."; \
	  curl -fsSL \
	    "https://github.com/gohugoio/hugo/releases/download/v$(HUGO_VERSION)/hugo_extended_$(HUGO_VERSION)_$(HUGO_SUFFIX).tar.gz" \
	    -o /tmp/hugo.tar.gz && tar -xzf /tmp/hugo.tar.gz -C bin hugo && rm -f /tmp/hugo.tar.gz; \
	  test -f $(HUGO) && echo "✓ Hugo ready" || { echo "✗ Hugo download failed"; exit 1; }; \
	else \
	  echo "✓ Hugo already present"; \
	fi

setup-tailwind:
	@mkdir -p bin
	@if [ ! -f $(TAILWIND) ]; then \
	  echo "→ Downloading Tailwind $(TAILWIND_VERSION)..."; \
	  curl -fsSL \
	    "https://github.com/tailwindlabs/tailwindcss/releases/download/v$(TAILWIND_VERSION)/tailwindcss-$(TW_PLATFORM)-$(TW_ARCH)" \
	    -o bin/tailwindcss && chmod +x bin/tailwindcss; \
	  echo "✓ Tailwind ready"; \
	else \
	  echo "✓ Tailwind already present"; \
	fi

setup-esbuild:
	@mkdir -p bin
	@if [ ! -f $(ESBUILD) ]; then \
	  echo "→ Downloading esbuild $(ESBUILD_VERSION)..."; \
	  curl -fsSL \
	    "https://registry.npmjs.org/@esbuild/$(ESBUILD_PLATFORM)-$(ESBUILD_ARCH)/-/$(ESBUILD_PLATFORM)-$(ESBUILD_ARCH)-$(ESBUILD_VERSION).tgz" \
	    | tar -xz --strip-components=2 -C bin package/bin/esbuild && \
	    chmod +x bin/esbuild; \
	  echo "✓ esbuild ready"; \
	else \
	  echo "✓ esbuild already present"; \
	fi

# ── Build steps ────────────────────────────────────────────────────────────────
worker:
	@echo "→ Compiling worker..."
	@mkdir -p worker/dist
	$(ESBUILD) worker/src/index.ts \
	  --bundle \
	  --platform=browser \
	  --target=es2022 \
	  --format=esm \
	  --outfile=worker/dist/index.js

css:
	@echo "→ Building CSS..."
	@mkdir -p site/static/css
	$(TAILWIND) -i site/assets/css/main.css -o site/static/css/main.css

css-watch:
	$(TAILWIND) -i site/assets/css/main.css -o site/static/css/main.css --watch

site: css
	@echo "→ Building Hugo site..."
	$(HUGO) --source site

build: worker css site
	@echo "✓ Full build complete"

# ── Local dev server ───────────────────────────────────────────────────────────
# Run css-watch in one terminal, dev in another.
dev: css
	$(HUGO) server --source site --buildDrafts --bind 0.0.0.0

# ── Deploy (requires wrangler in PATH) ────────────────────────────────────────
deploy-worker: worker
	cd worker && wrangler deploy

deploy-pages: site
	wrangler pages deploy site/public --project-name=cobolcaveman

deploy: deploy-worker deploy-pages

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
	rm -rf worker/dist site/public site/static/css/main.css
