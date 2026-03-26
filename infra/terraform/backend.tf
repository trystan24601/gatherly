terraform {
  backend "s3" {
    bucket         = "gatherly-terraform-state-299311846579"
    key            = "gatherly/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
    dynamodb_table = "gatherly-terraform-locks"
  }
}
