import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';


dotenv.config();

const PORT = process.env.PORT || 5000;

const app = new express();


if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'))
}

app.use(express.json())

app.get('/', (req,res)=>{
    res.send('API is running...')
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
