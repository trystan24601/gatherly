import { app } from './app'

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001

app.listen(port, () => {
  console.log(`Gatherly API running on port ${port}`)
})
