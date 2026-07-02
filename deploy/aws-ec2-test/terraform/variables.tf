variable "firm_name" {
  description = "Nama singkat firma klien (dipakai sebagai tag Name, mis. \"acme-kap\"). Satu instance = satu firma (model single-tenant, lihat docs/DEPLOY.md)."
  type        = string

  validation {
    condition     = length(var.firm_name) > 0 && can(regex("^[a-z0-9-]+$", var.firm_name))
    error_message = "firm_name wajib diisi, huruf kecil/angka/dash saja (dipakai di tag AWS)."
  }
}

variable "aws_region" {
  description = "Region AWS. README manual merekomendasikan ap-southeast-3 (Jakarta) untuk latensi; ap-southeast-1 (Singapura) alternatif."
  type        = string
  default     = "ap-southeast-3"
}

variable "instance_type" {
  description = "Tipe instance EC2. README manual: t3.small (x86) atau t4g.small (ARM, lebih murah)."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size_gb" {
  description = "Ukuran disk root (gp3). README manual: 20 GB cukup."
  type        = number
  default     = 20
}

variable "key_name" {
  description = "Nama EC2 key pair yang SUDAH ADA di akun AWS (dibuat lewat Console/CLI sebelumnya) — dipakai untuk akses SSH. Terraform tidak membuat key pair baru di sini (private key tak boleh lewat state file)."
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR yang diizinkan akses SSH (port 22). WAJIB IP Anda sendiri (mis. \"203.0.113.4/32\") — sesuai README manual \"TCP 22 dari IP Anda saja\". Tidak ada default supaya operator tidak lupa membatasinya."
  type        = string

  validation {
    condition     = var.allowed_ssh_cidr != "0.0.0.0/0"
    error_message = "allowed_ssh_cidr tidak boleh 0.0.0.0/0 — README manual mewajibkan SSH dibatasi ke IP operator saja."
  }
}

variable "use_elastic_ip" {
  description = "Pasang Elastic IP agar IP publik tak berubah saat instance di-stop/start (PUBLIC_HOST terikat ke IP). README merekomendasikan ini; default true untuk mencegah operator lupa."
  type        = bool
  default     = true
}

variable "extra_tags" {
  description = "Tag AWS tambahan opsional (mis. { ClientId = \"...\" }) untuk cost-tracking lintas-firma. Kosong secara default — tag Name/ManagedBy/Environment selalu ditambahkan otomatis."
  type        = map(string)
  default     = {}
}
