locals {
  tags = { application = "ataimo-portfolio", environment = "cloud", managed_by = "terraform" }
}
resource "azurerm_resource_group" "platform" {
  name     = "${var.name}-rg"
  location = var.location
  tags     = local.tags
}
resource "azurerm_virtual_network" "platform" {
  name                = "${var.name}-vnet"
  location            = var.location
  resource_group_name = azurerm_resource_group.platform.name
  address_space       = ["10.80.0.0/16"]
  tags                = local.tags
}
resource "azurerm_subnet" "platform" {
  name                 = "k3s"
  resource_group_name  = azurerm_resource_group.platform.name
  virtual_network_name = azurerm_virtual_network.platform.name
  address_prefixes     = ["10.80.1.0/24"]
}
resource "azurerm_network_security_group" "platform" {
  name                = "${var.name}-nsg"
  location            = var.location
  resource_group_name = azurerm_resource_group.platform.name
  tags                = local.tags
}
resource "azurerm_network_security_rule" "web" {
  name                        = "public-web"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["80", "443"]
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.platform.name
  network_security_group_name = azurerm_network_security_group.platform.name
}
resource "azurerm_network_security_rule" "admin" {
  name                        = "administrator-access"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["22", "6443"]
  source_address_prefixes     = var.admin_cidrs
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.platform.name
  network_security_group_name = azurerm_network_security_group.platform.name
}
resource "azurerm_network_security_rule" "mail" {
  count                       = var.mail_enabled ? 1 : 0
  name                        = "public-mail"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["25", "465", "587", "993"]
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.platform.name
  network_security_group_name = azurerm_network_security_group.platform.name
}
resource "azurerm_public_ip" "platform" {
  name                = "${var.name}-ip"
  location            = var.location
  resource_group_name = azurerm_resource_group.platform.name
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = var.dns_label
  tags                = local.tags
}
resource "azurerm_network_interface" "platform" {
  name                = "${var.name}-nic"
  location            = var.location
  resource_group_name = azurerm_resource_group.platform.name
  ip_configuration {
    name                          = "primary"
    subnet_id                     = azurerm_subnet.platform.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.platform.id
  }
  tags = local.tags
}
resource "azurerm_network_interface_security_group_association" "platform" {
  network_interface_id      = azurerm_network_interface.platform.id
  network_security_group_id = azurerm_network_security_group.platform.id
}
resource "azurerm_user_assigned_identity" "dns" {
  count               = var.azure_dns_zone_id == null ? 0 : 1
  name                = "${var.name}-dns"
  location            = var.location
  resource_group_name = azurerm_resource_group.platform.name
  tags                = local.tags
}
resource "azurerm_role_assignment" "dns" {
  count                = var.azure_dns_zone_id == null ? 0 : 1
  scope                = var.azure_dns_zone_id
  role_definition_name = "DNS Zone Contributor"
  principal_type       = "ServicePrincipal"
  principal_id         = azurerm_user_assigned_identity.dns[0].principal_id
}
resource "azurerm_linux_virtual_machine" "platform" {
  name                            = var.name
  location                        = var.location
  resource_group_name             = azurerm_resource_group.platform.name
  size                            = var.vm_size
  admin_username                  = var.admin_username
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.platform.id]
  admin_ssh_key {
    username   = var.admin_username
    public_key = file(pathexpand(var.ssh_public_key_path))
  }
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = 64
  }
  source_image_reference {
    publisher = var.source_image.publisher
    offer     = var.source_image.offer
    sku       = var.source_image.sku
    version   = var.source_image.version
  }
  dynamic "identity" {
    for_each = var.azure_dns_zone_id == null ? [] : [true]
    content {
      type         = "UserAssigned"
      identity_ids = [azurerm_user_assigned_identity.dns[0].id]
    }
  }
  boot_diagnostics {}
  tags       = local.tags
  depends_on = [azurerm_network_interface_security_group_association.platform]
}
resource "azurerm_managed_disk" "data" {
  name                 = "${var.name}-k3s-data"
  location             = var.location
  resource_group_name  = azurerm_resource_group.platform.name
  storage_account_type = "StandardSSD_LRS"
  create_option        = "Empty"
  disk_size_gb         = var.data_disk_size_gb
  tags                 = local.tags
  lifecycle { prevent_destroy = true }
}
resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.platform.id
  lun                = 0
  caching            = "None"
}
