import "./Nav.css";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Button from "react-bootstrap/Button";

const Nav = ({ Icon, title, isActive }) => {
  const popover = (
    <Popover id="popover-basic">
      <Popover.Body>{title}</Popover.Body>
    </Popover>
  );

  return (
    <div className="nav">
    {isActive ? (
      <OverlayTrigger trigger={["hover", "focus"]} placement="right" overlay={popover}>
        <Button variant="link" style={{color: '#fff', padding:0}}>
          {Icon && <Icon className="icon" />}
        </Button>
      </OverlayTrigger>
    ) : (
      Icon && <Icon className="icon" />
    )}
    {isActive ? null : <h2>{title}</h2>}
    </div>
  );
};

export default Nav;
