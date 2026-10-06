output "public_ip" { value = azurerm_public_ip.platform.ip_address }
output "vm_fqdn" { value = azurerm_public_ip.platform.fqdn }
output "admin_username" { value = var.admin_username }
output "resource_group" { value = azurerm_resource_group.platform.name }
output "vm_name" { value = azurerm_linux_virtual_machine.platform.name }
output "dns_identity_client_id" { value = try(azurerm_user_assigned_identity.dns[0].client_id, null) }
