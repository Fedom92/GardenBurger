

import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, updateDoc, doc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CryptoJS from 'crypto-js';
import { useForm } from "react-hook-form";
import '../../style/Main.css';


const Delivery = () => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div></div>
            )}
        </>
    );
}
export default Delivery;