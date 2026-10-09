aws_region           = "ap-south-1"
environment          = "staging"
project_name         = "agromart"
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]

eks_version            = "1.30"
eks_node_instance_type = "t3.medium"
eks_node_desired       = 2
eks_node_min           = 1
eks_node_max           = 4

db_username       = "agromart_admin"
db_password       = "ReplaceWithStrongPassword123!"
db_instance_class = "db.t4g.micro"