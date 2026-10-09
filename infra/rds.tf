# ─────────────────────────────────────────────────────────────────────────────
#  RDS PostgreSQL 16
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "postgres" {
  name        = "${var.project_name}-${var.environment}-rds-subnet-group"
  subnet_ids  = aws_subnet.private[*].id
  description = "Private subnets for AgroMart RDS"

  tags = { Name = "${var.project_name}-rds-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.project_name}-${var.environment}-postgres"
  engine            = "postgres"
  engine_version    = "16.3"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "agromart"
  username = var.db_username
  password = var.db_password # set in terraform.tfvars — never hardcode

  # Network: private subnets, not publicly reachable
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup & maintenance
  backup_retention_period   = 7
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot"

  tags = { Name = "${var.project_name}-${var.environment}-postgres" }
}