compose_file := "docker-compose.yaml"

# Start deployment stack in background and rebuild images.
up:
  docker compose -f {{compose_file}} up -d --build

# Stop and remove deployment stack.
down:
  docker compose -f {{compose_file}} down

# Restart running deployment services.
restart:
  docker compose -f {{compose_file}} restart

# Show deployment service status.
ps:
  docker compose -f {{compose_file}} ps

# Stream logs for full stack or a specific service.
logs service="":
  if ("{{service}}" -eq "") { docker compose -f {{compose_file}} logs -f } else { docker compose -f {{compose_file}} logs -f {{service}} }

# Pull latest images for services.
pull:
  docker compose -f {{compose_file}} pull

# Run DB migrations in server container.
migrate:
  docker compose -f {{compose_file}} exec server bun run db:migrate
