export type RegionDirectory = {
  id: string;
  title: string;
  shortTitle: string;
  communes: readonly string[];
};

// División político-administrativa: 16 regiones y 346 comunas.
// La portada usa "comuna" para mantener una cobertura territorial precisa.
export const regions = [
  {
    id: "arica-y-parinacota",
    title: "Región de Arica y Parinacota",
    shortTitle: "Arica y Parinacota",
    communes: ["Arica", "Camarones", "General Lagos", "Putre"],
  },
  {
    id: "tarapaca",
    title: "Región de Tarapacá",
    shortTitle: "Tarapacá",
    communes: ["Alto Hospicio", "Camiña", "Colchane", "Huara", "Iquique", "Pica", "Pozo Almonte"],
  },
  {
    id: "antofagasta",
    title: "Región de Antofagasta",
    shortTitle: "Antofagasta",
    communes: ["Antofagasta", "Calama", "María Elena", "Mejillones", "Ollagüe", "San Pedro de Atacama", "Sierra Gorda", "Taltal", "Tocopilla"],
  },
  {
    id: "atacama",
    title: "Región de Atacama",
    shortTitle: "Atacama",
    communes: ["Alto del Carmen", "Caldera", "Chañaral", "Copiapó", "Diego de Almagro", "Freirina", "Huasco", "Tierra Amarilla", "Vallenar"],
  },
  {
    id: "coquimbo",
    title: "Región de Coquimbo",
    shortTitle: "Coquimbo",
    communes: ["Andacollo", "Canela", "Coquimbo", "Combarbalá", "Illapel", "La Higuera", "La Serena", "Los Vilos", "Monte Patria", "Ovalle", "Paiguano", "Punitaqui", "Río Hurtado", "Salamanca", "Vicuña"],
  },
  {
    id: "valparaiso",
    title: "Región de Valparaíso",
    shortTitle: "Valparaíso",
    communes: ["Algarrobo", "Cabildo", "Calle Larga", "Cartagena", "Casablanca", "Catemu", "Concón", "El Quisco", "El Tabo", "Hijuelas", "Isla de Pascua", "Juan Fernández", "La Calera", "La Cruz", "La Ligua", "Limache", "Llaillay", "Los Andes", "Nogales", "Olmué", "Panquehue", "Papudo", "Petorca", "Puchuncaví", "Putaendo", "Quillota", "Quilpué", "Quintero", "Rinconada", "San Antonio", "San Esteban", "San Felipe", "Santa María", "Santo Domingo", "Valparaíso", "Villa Alemana", "Viña del Mar", "Zapallar"],
  },
  {
    id: "metropolitana-de-santiago",
    title: "Región Metropolitana de Santiago",
    shortTitle: "Metropolitana",
    communes: ["Alhué", "Buin", "Calera de Tango", "Cerrillos", "Cerro Navia", "Colina", "Conchalí", "Curacaví", "El Bosque", "El Monte", "Estación Central", "Huechuraba", "Independencia", "Isla de Maipo", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Lampa", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "María Pinto", "Melipilla", "Ñuñoa", "Padre Hurtado", "Paine", "Pedro Aguirre Cerda", "Peñaflor", "Peñalolén", "Pirque", "Providencia", "Pudahuel", "Puente Alto", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Bernardo", "San Joaquín", "San José de Maipo", "San Miguel", "San Pedro", "San Ramón", "Santiago", "Talagante", "Tiltil", "Vitacura"],
  },
  {
    id: "ohiggins",
    title: "Región del Libertador General Bernardo O'Higgins",
    shortTitle: "O'Higgins",
    communes: ["Chépica", "Chimbarongo", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "La Estrella", "Las Cabras", "Litueche", "Lolol", "Machalí", "Malloa", "Marchigüe", "Mostazal", "Nancagua", "Navidad", "Olivar", "Palmilla", "Paredones", "Peralillo", "Peumo", "Pichidegua", "Pichilemu", "Placilla", "Pumanque", "Quinta de Tilcoco", "Rancagua", "Rengo", "Requínoa", "San Fernando", "San Vicente", "Santa Cruz"],
  },
  {
    id: "maule",
    title: "Región del Maule",
    shortTitle: "Maule",
    communes: ["Cauquenes", "Chanco", "Colbún", "Constitución", "Curepto", "Curicó", "Empedrado", "Hualañé", "Licantén", "Linares", "Longaví", "Maule", "Molina", "Parral", "Pelarco", "Pelluhue", "Pencahue", "Rauco", "Retiro", "Río Claro", "Romeral", "Sagrada Familia", "San Clemente", "San Javier", "San Rafael", "Talca", "Teno", "Vichuquén", "Villa Alegre", "Yerbas Buenas"],
  },
  {
    id: "nuble",
    title: "Región de Ñuble",
    shortTitle: "Ñuble",
    communes: ["Bulnes", "Chillán", "Chillán Viejo", "Cobquecura", "Coelemu", "Coihueco", "El Carmen", "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil", "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay"],
  },
  {
    id: "biobio",
    title: "Región del Biobío",
    shortTitle: "Biobío",
    communes: ["Alto Biobío", "Antuco", "Arauco", "Cabrero", "Cañete", "Chiguayante", "Concepción", "Contulmo", "Coronel", "Curanilahue", "Florida", "Hualpén", "Hualqui", "Laja", "Lebu", "Lota", "Los Álamos", "Los Ángeles", "Mulchén", "Nacimiento", "Negrete", "Penco", "Quilaco", "Quilleco", "San Pedro de la Paz", "San Rosendo", "Santa Bárbara", "Santa Juana", "Talcahuano", "Tirúa", "Tomé", "Tucapel", "Yumbel"],
  },
  {
    id: "la-araucania",
    title: "Región de La Araucanía",
    shortTitle: "La Araucanía",
    communes: ["Angol", "Carahue", "Cholchol", "Collipulli", "Cunco", "Curacautín", "Curarrehue", "Ercilla", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Lonquimay", "Los Sauces", "Lumaco", "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Purén", "Renaico", "Saavedra", "Temuco", "Teodoro Schmidt", "Toltén", "Traiguén", "Victoria", "Vilcún", "Villarrica"],
  },
  {
    id: "los-rios",
    title: "Región de Los Ríos",
    shortTitle: "Los Ríos",
    communes: ["Corral", "Futrono", "La Unión", "Lago Ranco", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "Río Bueno", "Valdivia"],
  },
  {
    id: "los-lagos",
    title: "Región de Los Lagos",
    shortTitle: "Los Lagos",
    communes: ["Ancud", "Calbuco", "Castro", "Chaitén", "Chonchi", "Cochamó", "Curaco de Vélez", "Dalcahue", "Fresia", "Frutillar", "Futaleufú", "Hualaihué", "Llanquihue", "Los Muermos", "Maullín", "Osorno", "Palena", "Puerto Montt", "Puerto Octay", "Puerto Varas", "Puqueldón", "Purranque", "Puyehue", "Queilén", "Quellón", "Quemchi", "Quinchao", "Río Negro", "San Juan de la Costa", "San Pablo"],
  },
  {
    id: "aysen",
    title: "Región de Aysén del General Carlos Ibáñez del Campo",
    shortTitle: "Aysén",
    communes: ["Aysén", "Chile Chico", "Cisnes", "Cochrane", "Coyhaique", "Guaitecas", "Lago Verde", "O'Higgins", "Río Ibáñez", "Tortel"],
  },
  {
    id: "magallanes-y-antartica-chilena",
    title: "Región de Magallanes y de la Antártica Chilena",
    shortTitle: "Magallanes",
    communes: ["Antártica", "Cabo de Hornos", "Laguna Blanca", "Natales", "Porvenir", "Primavera", "Punta Arenas", "Río Verde", "San Gregorio", "Timaukel", "Torres del Paine"],
  },
] satisfies readonly RegionDirectory[];

export const communeTotal = regions.reduce((total, region) => total + region.communes.length, 0);
