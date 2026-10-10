variable "subscription_id" { type = string }
variable "location" { type = string }
variable "name" {
  type    = string
  default = "ataimo-platform"
}
variable "vm_size" {
  type    = string
  default = "Standard_E2as_v5"
}
variable "source_image" {
  type = object({
    publisher = string
    offer     = string
    sku       = string
    version   = string
  })
  default = {
    publisher = "MicrosoftCBLMariner"
    offer     = "azure-linux-3"
    sku       = "azure-linux-3-gen2"
    version   = "3.20260923.01"
  }
  description = "Pinned x64 Gen2 operating system image; changing it replaces the VM while retaining its separately managed data disk."
}
variable "admin_username" {
  type    = string
  default = "ataimo"
}
variable "ssh_public_key_path" { type = string }
variable "admin_cidrs" {
  type = list(string)
  validation {
    condition     = length(var.admin_cidrs) > 0 && alltrue([for cidr in var.admin_cidrs : can(cidrhost(cidr, 0))])
    error_message = "Supply valid administrator CIDRs for SSH and Kubernetes API access."
  }
}
variable "dns_label" {
  type = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,61}[a-z0-9]$", var.dns_label))
    error_message = "Use an Azure DNS label of 3–63 lowercase letters, numbers and hyphens."
  }
}
variable "data_disk_size_gb" {
  type    = number
  default = 128
}
variable "azure_dns_zone_id" {
  type    = string
  default = null
}
variable "mail_enabled" {
  type    = bool
  default = false
}
