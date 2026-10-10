# ─────────────────────────────────────────────────────────────────────────────
#  IRSA — IAM Roles for Service Accounts
#  Allows Kubernetes pods to call AWS APIs (Secrets Manager) without
#  hardcoded credentials.
# ─────────────────────────────────────────────────────────────────────────────

# ── OIDC Provider for EKS (enables IRSA) ────────────────────────────────────
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = { Name = "${var.project_name}-eks-oidc" }
}

# ── IAM Role — Backend Service Account ──────────────────────────────────────
# Trusted by the Kubernetes SA "agromart-backend-sa" in the "agromart" namespace
data "aws_iam_policy_document" "backend_sa_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.eks.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub"
      values   = ["system:serviceaccount:agromart:agromart-backend-sa"]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backend_sa" {
  name               = "${var.project_name}-backend-sa-role"
  assume_role_policy = data.aws_iam_policy_document.backend_sa_assume.json

  tags = { Name = "${var.project_name}-backend-sa-role" }
}

# Grant access to agromart/* secrets in Secrets Manager only
resource "aws_iam_role_policy" "backend_sa_secrets" {
  name = "secrets-manager-access"
  role = aws_iam_role.backend_sa.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ]
      Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:agromart/*"
    }]
  })
}

output "backend_sa_role_arn" {
  description = "IAM Role ARN to annotate on the agromart-backend-sa Kubernetes Service Account"
  value       = aws_iam_role.backend_sa.arn
}
