# Base directory for .proto files
PROTO_DIR = ./proto
OUTPUT_DIR = ./server/proto
OUTPUT_TS_DIR = ./src/gen/proto

# Detect operating system
ifeq ($(OS),Windows_NT)
    # Windows settings
    MKDIR = if not exist "$(subst /,\,$(OUTPUT_DIR))" mkdir "$(subst /,\,$(OUTPUT_DIR))"
    RM = del /Q
    PATH_SEP = \\
else
    # Unix settings
    MKDIR = mkdir -p $(OUTPUT_DIR)
    RM = rm -f
    PATH_SEP = /
endif

# Automatically find all .proto files
PROTO_FILES = $(wildcard $(PROTO_DIR)/*.proto)

# Convert paths for Windows
PYTHON_GEN_FILES = $(patsubst $(PROTO_DIR)/%.proto, $(OUTPUT_DIR)/%_pb2.py, $(PROTO_FILES))

# Default target
all: proto

# Target to compile .proto files to Python
proto: $(PYTHON_GEN_FILES)

$(OUTPUT_DIR)/%_pb2.py: $(PROTO_DIR)/%.proto
	@$(MKDIR)
	@protoc -I=$(PROTO_DIR) --python_out=pyi_out:$(OUTPUT_DIR) $<
	@echo "Generated python $@"
	@npx buf generate
	@echo "Generated typescript $@"

# Clean up generated files
clean:
	@$(RM) $(subst /,$(PATH_SEP),$(OUTPUT_DIR)/*_pb2.py) 2>nul || echo "No files to clean"
	@$(RM) $(subst /,$(PATH_SEP),$(OUTPUT_DIR)/*_pb2.pyi) 2>nul || echo "No files to clean"
	@echo "Cleaned up generated python files"
	@$(RM) $(subst /,$(PATH_SEP),$(OUTPUT_TS_DIR)/*_pb.ts) 2>nul || echo "No files to clean"
	@echo "Cleaned up generated typescript files"

python:
	@python server/main.py

# Phony targets
.PHONY: all proto clean
