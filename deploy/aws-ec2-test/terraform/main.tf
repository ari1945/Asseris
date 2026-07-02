terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = merge(
    {
      Name        = "asseris-${var.firm_name}"
      ManagedBy   = "terraform"
      Environment = "pilot"
      Project     = "asseris-single-tenant"
    },
    var.extra_tags
  )
}

# Latest Ubuntu 22.04 in the target region — pinned to the 22.04 major version (not a bare
# "most recent Ubuntu"), so a new point-release picks up automatically but the OS generation
# never silently jumps. Matches README manual §1 ("AMI: Ubuntu 22.04").
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security group — 3 rules, identical to README manual §1 "Security Group (inbound)".
resource "aws_security_group" "asseris" {
  name        = "asseris-${var.firm_name}-sg"
  description = "Asseris single-tenant pilot: SSH (operator IP only) + HTTP/HTTPS (Caddy)"
  tags        = local.common_tags

  ingress {
    description = "SSH from operator only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "HTTP — needed for the ACME (Let's Encrypt) challenge when CADDY_TLS_MODE=acme"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS — app traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "asseris" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.asseris.id]
  user_data              = file("${path.module}/user-data.sh.tpl")

  root_block_device {
    volume_size = var.root_volume_size_gb
    volume_type = "gp3"
  }

  tags = local.common_tags
}

resource "aws_eip" "asseris" {
  count    = var.use_elastic_ip ? 1 : 0
  instance = aws_instance.asseris.id
  domain   = "vpc"
  tags     = local.common_tags
}
