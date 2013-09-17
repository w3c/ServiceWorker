all: build

build:
	node_modules/typescript/bin/tsc --target ES5 service_worker.ts

.PHONY: build
