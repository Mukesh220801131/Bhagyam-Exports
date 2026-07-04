import axios from "axios";

/**
 * Looks up city, state, and location details for a given Indian Pincode.
 * @param {string|number} pincode 
 * @returns {Promise<{success: boolean, city?: string, state?: string, country?: string, message: string}>}
 */
export const lookupPincode = async (pincode) => {
  const cleanPincode = pincode.toString().trim();
  
  if (!cleanPincode) {
    return { success: false, message: "" };
  }

  if (cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
    return { success: false, message: "Pincode must be exactly 6 digits" };
  }

  try {
    const response = await axios.get(`https://api.postalpincode.in/pincode/${cleanPincode}`);
    const data = response.data?.[0];

    if (data && data.Status === "Success" && data.PostOffice?.length > 0) {
      const info = data.PostOffice[0];
      return {
        success: true,
        city: info.District,
        state: info.State,
        country: "India",
        message: `Validated: ${info.District}, ${info.State}`
      };
    } else {
      return { success: false, message: "Pincode not found in database" };
    }
  } catch (error) {
    return { success: false, message: "Network error validating pincode" };
  }
};
