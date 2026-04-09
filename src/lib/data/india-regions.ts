export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  "Tamil Nadu": [
    "Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul",
    "Erode","Kallakurichi","Kanchipuram","Kanyakumari","Karur","Krishnagiri","Madurai",
    "Mayiladuthurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai",
    "Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur","Theni",
    "Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupathur","Tiruppur","Tiruvallur",
    "Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar"
  ],

  "Karnataka": [
    "Bagalkot","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar",
    "Chamarajanagar","Chikkaballapur","Chikkamagaluru","Chitradurga","Dakshina Kannada",
    "Davanagere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar",
    "Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi",
    "Uttara Kannada","Vijayapura","Yadgir"
  ],

  "Maharashtra": [
    "Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana","Chandrapur",
    "Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur",
    "Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad",
    "Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg",
    "Solapur","Thane","Wardha","Washim","Yavatmal"
  ],

  "Uttar Pradesh": [
    "Agra","Aligarh","Amethi","Amroha","Auraiya","Ayodhya","Azamgarh","Baghpat","Bahraich",
    "Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti","Bhadohi","Bijnor",
    "Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah",
    "Farrukhabad","Fatehpur","Firozabad","Ghaziabad","Ghazipur","Gonda","Gorakhpur",
    "Hamirpur","Hapur","Hardoi","Hathras","Jaunpur","Jhansi","Kannauj","Kanpur Dehat",
    "Kanpur Nagar","Kasganj","Kaushambi","Kheri","Kushinagar","Lalitpur","Lucknow",
    "Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad",
    "Muzaffarnagar","Pilibhit","Pratapgarh","Prayagraj","Raebareli","Rampur",
    "Saharanpur","Shamli","Shravasti","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"
  ],

  "Gujarat": [
    "Ahmedabad","Amreli","Anand","Aravalli","Banaskantha","Bharuch","Bhavnagar",
    "Botad","Chhota Udaipur","Dahod","Dang","Devbhoomi Dwarka","Gandhinagar",
    "Gir Somnath","Jamnagar","Junagadh","Kheda","Kutch","Mahisagar","Mehsana",
    "Morbi","Narmada","Navsari","Panchmahal","Patan","Porbandar","Rajkot",
    "Sabarkantha","Surat","Surendranagar","Tapi","Vadodara","Valsad"
  ],

  "Telangana": [
    "Adilabad","Bhadradri Kothagudem","Hyderabad","Jagtial","Jangaon","Jayashankar Bhupalpally",
    "Jogulamba Gadwal","Kamareddy","Karimnagar","Khammam","Komaram Bheem",
    "Mahabubabad","Mahbubnagar","Mancherial","Medak","Medchal","Mulugu",
    "Nagarkurnool","Nalgonda","Narayanpet","Nirmal","Nizamabad","Peddapalli",
    "Rajanna Sircilla","Rangareddy","Sangareddy","Siddipet","Suryapet",
    "Vikarabad","Wanaparthy","Warangal Rural","Warangal Urban","Yadadri Bhuvanagiri"
  ],

  "Delhi": [
    "Central Delhi","East Delhi","New Delhi","North Delhi","North East Delhi",
    "North West Delhi","Shahdara","South Delhi","South East Delhi",
    "South West Delhi","West Delhi"
  ],

  "Kerala": [
    "Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam",
    "Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta",
    "Thiruvananthapuram","Thrissur","Wayanad"
  ],

  "Rajasthan": [
    "Ajmer","Alwar","Banswara","Baran","Barmer","Bharatpur","Bhilwara",
    "Bikaner","Bundi","Chittorgarh","Churu","Dausa","Dholpur","Dungarpur",
    "Hanumangarh","Jaipur","Jaisalmer","Jalore","Jhalawar","Jhunjhunu",
    "Jodhpur","Karauli","Kota","Nagaur","Pali","Pratapgarh","Rajsamand",
    "Sawai Madhopur","Sikar","Sirohi","Sri Ganganagar","Tonk","Udaipur"
  ],

  "West Bengal": [
    "Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur",
    "Darjeeling","Hooghly","Howrah","Jalpaiguri","Jhargram","Kalimpong",
    "Kolkata","Malda","Murshidabad","Nadia","North 24 Parganas",
    "Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman",
    "Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"
  ]
};

export function getDistrictsForState(state: string): string[] {
  return DISTRICTS_BY_STATE[state] || ["Other"];
}