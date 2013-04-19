all: build

build:
	tsc --target ES5 controller.ts

.PHONY: build
