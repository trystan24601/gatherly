---                                                                                                                                                                                         
  Step 1: Create the AWS account
                                                                                                                                                                                              
  1. Go to aws.amazon.com and click Create an AWS Account   
  2. Use a dedicated email address (e.g. aws@yourdomain.com if you have one, or a Gmail you control)                                                                                          
  3. Choose Personal account type                                                                                                                                                             
  4. Enter a credit card — you won't be charged unless you exceed free tier limits                                                                                                            
  5. Complete phone verification                                                                                                                                                              
                                                                                                                                                                                              
  ---                                                                                                                                                                                         
  Step 2: Secure the root account (important)               
                                                                                                                                                                                              
  The root account has unlimited power — lock it down immediately:
                                                                                                                                                                                              
  1. Sign in, go to My Account → Security credentials                                                                                                                                         
  2. Enable MFA (Multi-Factor Authentication) — use an authenticator app like Google Authenticator or 1Password
  3. Do not create access keys for root — ever                                                                                                                                                
                                                                                                                                                                                              
  ---                                                                                                                                                                                         
  Step 3: Create an admin IAM user for daily use                                                                                                                                              
                                                                                                                                                                                              
  You should never use the root account day-to-day:
                                                                                                                                                                                              
  1. Go to IAM → Users → Create user                                                                                                                                                          
  2. Name it admin (or your name)
  3. Attach the AdministratorAccess policy                                                                                                                                                    
  4. Enable console access with a password                                                                                                                                                    
  5. Enable MFA on this user too
  6. Under Security credentials, create Access keys — choose "CLI" use case                                                                                                                   
  7. Save the Access Key ID and Secret Access Key somewhere safe (e.g. 1Password) — you only see them once                                                                                    
                                                                                                                                                                                              
  ---                                                                                                                                                                                         
  Step 4: Set a billing alert                                                                                                                                                                 
                                                                                                                                                                                              
  Prevents surprise bills:
                                                                                                                                                                                              
  1. Go to Billing → Budgets → Create budget                                                                                                                                                  
  2. Choose Monthly cost budget
  3. Set amount to $20 (safe buffer for dev)                                                                                                                                                  
  4. Add your email for alerts at 80% and 100%                                                                                                                                                
                                                                                                                                                                                              
  ---                                                                                                                                                                                         
  Step 5: Install the AWS CLI locally                                                                                                                                                         
                                                                                                                                                                                              
  On your machine, run:
  ! curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install                                                             
                                                            
  Then configure it with your IAM user credentials:                                                                                                                                           
  ! aws configure
  Enter your Access Key ID, Secret Access Key, region eu-west-2, and output format json.
