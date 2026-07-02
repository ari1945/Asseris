output "public_ip" {
  description = "IP publik instance (Elastic IP kalau use_elastic_ip=true). Pakai ini untuk PUBLIC_HOST di deploy/aws-ec2-test/.env (mis. via sslip.io: 13-54-2-9.sslip.io)."
  value       = var.use_elastic_ip ? aws_eip.asseris[0].public_ip : aws_instance.asseris.public_ip
}

output "instance_id" {
  description = "ID instance EC2 (untuk console/CLI lanjutan, mis. Start/Stop)."
  value       = aws_instance.asseris.id
}

output "security_group_id" {
  description = "ID security group yang dibuat."
  value       = aws_security_group.asseris.id
}

output "ssh_command" {
  description = "Perintah SSH siap-pakai untuk melanjutkan ke docs/DEPLOY.md §1 (generate kunci) dan deploy/aws-ec2-test/README.md §3 (clone repo)."
  value       = "ssh ubuntu@${var.use_elastic_ip ? aws_eip.asseris[0].public_ip : aws_instance.asseris.public_ip}"
}
