all: build

build:
	node_modules/typescript/bin/tsc --target ES5 controller.ts

.PHONY: build
