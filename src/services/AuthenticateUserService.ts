import axios from "axios"
import  prismaClient  from "../prisma"
import {sign} from 'jsonwebtoken'
/*
RECEBER O CODIGO VIA STRING
RECUPERAR O  ACESSS_TOKENN NO GITHUB (O GITHUB HUB QUE DISPONIBILIZA O TOKEN)
RECUPERAR INFORMAÇÕES DO USUARIO NO GITHUB
VERIFICAR SE O USUARIO EXISTE NO BANCO DE DADOS
SE ELE EXISTIR (SIM) GERA UM TOKEN
SE ELE NAO EXISTIR (NAO) NO BANCO DE DADOS, CRIAMOS ELE NO BD, GERAMOS UM TOKEN
RETORNAMOS O TOKEN COM AS INFORMAÇÕES DO USUARIO 
*/
interface IAccessTokenResponse{
    access_token:string
}

interface IUserResponse {
    avatar_url:string,
    login: string,
    id:number,
    name:string
}

class AuthenticateUserService{
   async execute(code:string){
    const url = "https://github.com/login/oauth/access_token";
    
    const {data:accessTokenResponse} = await axios.post<IAccessTokenResponse>(url, null,{
            params:{
                client_id:process.env.GITHUB_CLIENT_ID,
                client_secret:process.env.GITHUB_CLIENT_SECRET,
                code,
            },
            headers:{
                "Accept": "application/json"
            }
    });

    const response = await axios.get<IUserResponse>("https://api.github.com/user",{
        headers:{
            authorization: `Bearer ${accessTokenResponse.access_token}`
        }
    })
    const { login, id, avatar_url, name } = response.data
    
    let user = await  prismaClient.user.findFirst({
        where:{
             github_id: id
        }
    })

    if(!user){
         await prismaClient.user.create({
             data:{
                github_id:id,
                login,
                avatar_url,
                name
               
                
                 
            
             }
         })

    }

    const token = sign(
    {
     user:{
         name: user.name,
         avatar_url: user.avatar_url,
         id:user.id
     }
    },
    process.env.JWT_SECRET,
    {
        subject:user.id,
        expiresIn:"1d"

    }
    )

    return {token, user};
   }

}

export {AuthenticateUserService}