terraform {
  backend "azurerm" {
    use_azuread_auth     = true
    use_cli              = true
    tenant_id            = "9a97eea6-f7d2-4db8-b952-57201c9b2843"
    storage_account_name = "donerguidetfstatesa"
    container_name       = "doner-guide-tfstate-sa-container"
    key                  = "doner-guide.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "4.54.0"
    }
  }
}

provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "rg" {
  name     = "${var.prefix}-rg"
  location = "West Europe"
}
