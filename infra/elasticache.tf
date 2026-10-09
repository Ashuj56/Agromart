# ─────────────────────────────────────────────────────────────────────────────
#  ElastiCache Redis 7
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-subnet"
  subnet_ids  = aws_subnet.private[*].id
  description = "Private subnets for AgroMart Redis cache"

  tags = { Name = "${var.project_name}-redis-subnet-group" }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project_name}-${var.environment}-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  # Network: private subnets, locked down by security group
  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  tags = { Name = "${var.project_name}-${var.environment}-redis" }
}