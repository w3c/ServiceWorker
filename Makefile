all: build

build:
	node_modules/typescript/bin/tsc --target ES5 event_worker.ts

.PHONY: build
