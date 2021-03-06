const joi = require("joi")
const fs = require("fs")
const util = require("util")
const pretty = require("prettysize")

module.exports = (app) => {
  var model = app.model.folder
  var db = app.get("database")

  var folder = {}

  var all = util.promisify(db.all).bind(db)

  folder.create = async (req, res) => {
    let data = req.body
    let result = joi.validate(data, model)
    if (result.error) {
      res.status(400).json(result.error).end()
    }
    else {
      let user = await all("SELECT * FROM users WHERE nick = ?", [data.nick])
      if (user.length == 0) {
        res.status(404).json({ "Message": "User not found" }).end()
      }
      else {
        try {
          let userFolder = await all("SELECT id FROM folders WHERE idUser = ?", [user[0].id])
          if (userFolder.length > 0) {
            res.status(409).json({ "Message": "User already exists a folder" }).end()
          }
          else {
            fs.mkdir("./data/" + data.nameFolder, async (err) => {
              if (err) {
                res.status(409).json({ "Message": "Folder already exists" }).end()
              }
              else {
                db.run("INSERT INTO folders (nameFolder,idUser) VALUES (?,?)", [data.nameFolder, user[0].id], (err, result) => {
                  let message = {
                    "Message": "Folder create successful",
                    "urlFolder": `${process.env.protocol}://${req.headers.host}/${data.nameFolder}`
                  }
                  res.status(201).json(message).end()
                })
              }
            })
          }
        } catch (error) {
          res.status(500).json({ "Message": "Server Error" })
        }
      }
    }
  }

  folder.list = (req, res) => {
    let nameFolder = req.params.nameFolder
    let type = req.query.type
    fs.readdir("./data/" + nameFolder, (err, data) => {
      if (err) {
        res.status(404).json({ "Message": "Folder not found" }).end()
      }
      else {
        if (data.length > 0) {
          if (type) {
            if (type == "folder") {
              let folder = []
              for (let i = 0; i < data.length; i++) {
                if (data[i].search(new RegExp("[.]")) == -1) {
                  folder.push({ "name": data[i], "type": "folder" })
                }
              }
              res.status(200).json(folder).end()
            }
            else if (type == "object") {
              let object = []
              for (let i = 0; i < data.length; i++) {
                if (data[i].search(new RegExp("[.]")) != -1) {
                  object.push({ "name": data[i], "type": "object" })
                }
              }
              res.status(200).json(object).end()
            }
            else {
              res.status(200).json([]).end()
            }
          }
          else {
            for (let i = 0; i < data.length; i++) {
              if (data[i].search(new RegExp("[.]")) == -1) {
                data[i] = { "name": data[i], "type": "folder" }
              }
              else {
                data[i] = { "name": data[i], "type": "object" }
              }
            }
            res.status(200).json(data).end()
          }
        }
        else {
          res.status(200).json(data).end()
        }
      }
    })
  }

  folder.stats = (req, res) => {
    let nameFolder = req.params.nameFolder
    fs.stat("./data/" + nameFolder,(err, data) => {
      if (err) {
        res.status(404).json({ "Message": "Folder not found" }).end()
      }
      else {                      
        let size = sizeFolder(nameFolder)
        let doc = {
          "created": {
            "date": generateDate(data.birthtime),
            "time": generateTime(data.birthtime)
          },
          "access": {
            "date": generateDate(data.atime),
            "time": generateTime(data.atime)
          },
          "modified": {
            "date": generateDate(data.mtime),
            "time": generateTime(data.mtime)
          },
          "size": pretty(size)
        }
        res.status(200).json(doc).end()
      }
    })
  }

  folder.edit = async (req, res) => {
    let data = req.body
    let nameFolderCurrent = req.params.nameFolderCurrent
    let result = joi.validate(data, model)
    if (result.error) {
      res.status(400).json(result.error).end()
    }
    else {
      let user = await all("SELECT id FROM users WHERE nick = ?", [data.nick])
      if (user.length == 0) {
        res.status(404).json({ "Message": "User not found" }).end()
      }
      else {
        fs.rename("./data/" + nameFolderCurrent, "./data/" + data.nameFolder, async (err) => {
          if (err) {
            res.status(409).json({ "Message": "Folder already exists" }).end()
          }
          else {
            db.run("UPDATE folders SET nameFolder = ? WHERE idUser = ?", [data.nameFolder, user[0].id], (err, result) => {
              let message = {
                "Message": "Folder rename successful",
                "urlFolder": `${process.env.protocol}://${req.headers.host}/${data.nameFolder}`
              }
              res.status(200).json(message).end()
            })
          }
        })
      }
    }
  }

  folder.delete = async (req, res) => {
    let nameFolder = req.params.nameFolder
    fs.rmdir("./data/" + nameFolder, async (err) => {
      if (err) {
        if (err.errno == -2) {
          res.status(404).json({ "Message": "Folder not found" })
        }
        if (err.errno == -17 || err.errno == -39) {
          res.status(409).json({ "Message": "Folder is not empty" })
        }
      }
      else {
        try {
          let idFolder = await all("SELECT id FROM folders WHERE nameFolder = ?", [nameFolder])
          db.run("DELETE FROM folders WHERE id = ?", [idFolder[0].id], (err, result) => {
            if (err) {
              res.status(500).json({ 'Message': 'Server Error' })
            }
            else {
              res.status(200).json({ "Message": "Folder removed successful" })
            }
          })
        } catch (error) {
          fs.mkdirSync(`./data/${nameFolder}`)
          res.status(500).json({ "Message": "Server Error" })
        }
      }
    })
  }

  function generateDate(time) {
    let date = new Date(time)
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  }

  function generateTime(time) {
    let hour = new Date(time)
    return `${hour.getHours()}:${hour.getMinutes()}:${hour.getSeconds()}`
  }

  function sizeFolder(name) {
    let size = 0
    let data = fs.readdirSync(`./data/${name}`)
    for (let i = 0; i < data.length; i++) {
      if (data[i].search(new RegExp("[.]")) == -1) {        
        size += sizeSubFolder(name,data[i])      
      }
      else {
        size += fs.statSync(`./data/${name}/${data[i]}`).size
      }
    }    
    return size    
  }

  function sizeSubFolder(nameFolder,nameSubFolder) {
    let size = 0
    let data = fs.readdirSync(`./data/${nameFolder}/${nameSubFolder}`)
    for (let i = 0; i < data.length; i++) {
      size += fs.statSync(`./data/${nameFolder}/${nameSubFolder}/${data[i]}`).size
    }
    return size  
  }

  return folder
}
