provider "aws" {
  region = "eu-west-2"

  default_tags {
    tags = {
      Project   = "gatherly"
      ManagedBy = "terraform"
    }
  }
}

# ACM certificates for CloudFront must be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "gatherly"
      ManagedBy = "terraform"
    }
  }
}
