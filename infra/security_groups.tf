# ─────────────────────────────────────────────────────────────────────────────
#  Security Groups
# ─────────────────────────────────────────────────────────────────────────────

# ── EKS Cluster Control Plane SG ─────────────────────────────────────────────
resource "aws_security_group" "eks_cluster" {
  name        = "${var.project_name}-eks-cluster-sg"
  description = "Security group for EKS cluster control plane"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = { Name = "${var.project_name}-eks-cluster-sg" }
}

# ── EKS Worker Nodes SG ───────────────────────────────────────────────────────
resource "aws_security_group" "eks_nodes" {
  name        = "${var.project_name}-eks-nodes-sg"
  description = "Security group for EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  # Nodes can talk to each other
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
    description = "Node-to-node communication"
  }

  # Control plane can reach nodes
  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
    description     = "Control plane to nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = { Name = "${var.project_name}-eks-nodes-sg" }
}

# ── RDS Security Group ────────────────────────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Allow PostgreSQL access from EKS nodes only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [
      aws_security_group.eks_nodes.id,
      aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
    ]
    description     = "PostgreSQL from EKS nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-rds-sg" }
}

# ── ElastiCache (Redis) Security Group ───────────────────────────────────────
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-redis-sg"
  description = "Allow Redis access from EKS nodes only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [
      aws_security_group.eks_nodes.id,
      aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
    ]
    description     = "Redis from EKS nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-redis-sg" }
}