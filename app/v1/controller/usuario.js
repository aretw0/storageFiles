module.exports = (app) => {
   var model = app.model.usuario
   var joi = app.get("joi")
   var util = app.get("util")
   var db = app.get("database")

   var usuario = {}

   var versao = "/v1"

   var all = util.promisify(db.all).bind(db)

   usuario.salvar = async (req,res) => {
      let dados = req.body
      let result = joi.validate(dados,model)
      if (result.error!=null) {
        res.status(400).json(result.error)
      }
      else {
        let email = await all("SELECT email FROM users WHERE email = ?",[dados.email])
        let nick = await all("SELECT nick FROM users WHERE nick = ?",[dados.nick])
        if (email.length!=0) {
          res.status(409).json({"Mensagem":"Já existe usuário com o mesmo email"})
        }
        else if (nick.length!=0) {
          res.status(409).json({"Mensagem":"Já existe usuário com o mesmo nick"})
        }
        else {
          db.run("INSERT INTO users (nomeUsuario,dataNascimento,sexo,nick,email,password) VALUES (?,?,?,?,?,?)",[dados.nomeUsuario,dados.dataNascimento,dados.sexo,dados.nick,dados.email,dados.password],(err,result) => {
             if (err) {
                res.status(500).json(err)
             }
             else {
                let mensagem = {
                  "Mensagem": "Usuário cadastrado com sucesso",
                  "_links": [
                    {"rel":"Criar Pasta","method":"POST","href":`http://${req.headers.host}${versao}/pastas`},
                    {"rel":"Login","method":"PUT","href":`http://${req.headers.host}${versao}/usuarios/login`}
                  ]
                }
                res.status(201).json(mensagem)
             }
          })
        }
      }
   }

   usuario.user = (req,res) => {
     db.all("SELECT * FROM users",(err,result) => {
       if (err) {
         res.status(500).json(err)
       }
       else {
         result.push([
           {"rel":"Criar Pasta","method":"POST","href":`http://${req.headers.host}${versao}/pastas`},
           {"rel":"Login","method":"PUT","href":`http://${req.headers.host}${versao}/usuarios/login`}
         ])
         res.status(200).json(result)
       }
     })
   }

   usuario.listarUser = (req,res) => {
     let id = req.params.id
     db.all("SELECT * FROM users WHERE id = ?",[id],(err,result) => {
        if (err) {
          res.status(500).json(err)
        }
        else {
          if (result.length==0) {
            res.status(404).json({"Mensagem":"Usuário não encontrado"})
          }
          else {
            result[0]._links = [
              {"rel":"Editar Usuário","method":"PUT","href":`http://${req.headers.host}${versao}/usuarios/${id}`},
              {"rel":"Excluir Usuário","method":"DELETE","href":`http://${req.headers.host}${versao}/usuarios/${id}`}
            ]
            res.status(200).json(result[0])
          }
        }
     })
   }

   usuario.login = (req,res) => {
     let dados = req.body
     if (dados.email && dados.password) {
       db.all("SELECT * FROM users WHERE email = ? and password = ?",[dados.email,dados.password],(err,result) => {
         if (err) {
           res.status(500).json(err)
         }
         else {
           if (result[0]==null) {
             res.status(404).json({"Mensagem":"Email ou senha estão incorretos"})
           }
           else {
             result[0]._links = [
               {"rel":"Criar Usuário","method":"POST","href":`http://${req.headers.host}${versao}/usuarios`},
               {"rel":"Criar Pasta","method":"POST","href":`http://${req.headers.host}${versao}/pastas`}
             ]
             res.status(200).json(result[0])
           }
         }
       })
     }
     else {
       res.status(400).json({"Mensagem":"No corpo da mensagem tem que estar presente o email e o password"})
     }
   }

   usuario.editar = (req,res) => {
     let id = req.params.id
     let dados = req.body
     let result = joi.validate(dados,model)
     if (result.error!=null) {
       res.status(400).json(result.error)
     }
     else {
       db.run("UPDATE users SET nomeUsuario = ?, dataNascimento = ?, sexo = ?, nick = ?,email = ?, password = ? WHERE id = ?",[dados.nomeUsuario,dados.dataNascimento,dados.sexo,dados.nick,dados.email,dados.password,id],(err,result) => {
         if (err) {
            res.status(500).json(err)
         }
         else {
            let mensagem = {
              "Mensagem": "Usuário atualizado com sucesso",
              "_links": [
                {"rel":"Procurar Usuário","method":"GET","href":`http://${req.headers.host}${versao}/usuarios/${id}`},
                {"rel":"Excluir Usuário","method":"DELETE","href":`http://${req.headers.host}${versao}/usuarios/${id}`}
              ]
            }
            res.status(200).json(mensagem)
         }
       })
     }
   }

   usuario.deletar = async (req,res) => {
      let id = req.params.id
      db.run("DELETE FROM users WHERE id = ?",[id],(err,result) => {
         if (err) {
           res.status(500).json(err)
         }
         else {
           let mensagem = {
             "Mensagem": "Usuário excluido com sucesso",
             "_links": [
               {"rel":"Procurar Usuário","method":"GET","href":`http://${req.headers.host}${versao}/usuarios/${id}`},
               {"rel":"Editar Usuário","method":"PUT","href":`http://${req.headers.host}${versao}/usuarios/${id}`}
             ]
           }
           res.status(200).json(mensagem)
         }
      })
   }


   return usuario
}
