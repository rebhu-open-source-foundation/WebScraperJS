# Upgrade

Steps taken to upgrade to node v-14

- 7 process pending and 2 failing
  - Cannot read property 'auth' of undefined
  

- puppeteer 2021-06-05
  - cannot find module 'puppeteer/lib/ExecutionContext'
  - resolve by changing the path 

- gulp-spawn-mocha 
  - package doesn't support mocha 7
  - resolve by finding an alternative 
