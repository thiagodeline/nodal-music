export const GENRES=['Hip-Hop','Trap','Boom Bap','Rap','Drill','Pop','MPB','Sertanejo','Funk','R&B / Soul','Eletrônica','House','Techno','Rock','Indie','Reggae','Jazz','Blues','Gospel','Clássica','Forró','Pagode','Samba','Lo-fi','Experimental','Outro'] as const
export const LANGUAGES=[{code:'pt',label:'Português'},{code:'en',label:'Inglês'},{code:'es',label:'Espanhol'},{code:'fr',label:'Francês'},{code:'it',label:'Italiano'},{code:'de',label:'Alemão'},{code:'ja',label:'Japonês'},{code:'ko',label:'Coreano'},{code:'zh',label:'Chinês'},{code:'instrumental',label:'Instrumental'}] as const
export type ReleaseFormat='single'|'ep'|'album'
export const releaseFormat=(count:number):ReleaseFormat=>count<=1?'single':count<=4?'ep':'album'
export const formatName:Record<ReleaseFormat,string>={single:'Single',ep:'EP',album:'Álbum'}
